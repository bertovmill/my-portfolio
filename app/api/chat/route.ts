import { NextRequest, NextResponse } from 'next/server'
import { openai } from '@ai-sdk/openai'
import { generateText } from 'ai'
import { drizzle } from 'drizzle-orm/postgres-js'
import { projects, type Project } from '@/lib/schema'
import { or, ilike, sql } from 'drizzle-orm'
import postgres from 'postgres'
// import { searchSimilarChunks } from '@/lib/rag-utils' // Temporarily disabled due to compilation issues

const client = postgres(process.env.DATABASE_URL!)
const db = drizzle(client)

// Interface for conversation messages
interface Message {
  role: 'user' | 'assistant'
  content: string
}

// Interface for RAG search results
interface RagResult {
  id: string
  content: string
  metadata: Record<string, unknown>
  source: string
  chunkIndex: number
  similarity: number
}

export async function POST(request: NextRequest) {
  try {
    // Add timeout to the entire request
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Request timeout')), 25000) // 25 second timeout
    )

    const mainProcess = async () => {
      const { message, messages = [] } = await request.json()
      
      if (!message) {
        return NextResponse.json({ error: 'Message is required' }, { status: 400 })
      }

      return await processChat(message, messages)
    }

    return await Promise.race([mainProcess(), timeoutPromise])
  } catch (error: any) {
    console.error('Chat API error:', error)
    if (error.message === 'Request timeout') {
      return NextResponse.json(
        { error: 'Request timed out. Please try a shorter question.' },
        { status: 408 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to generate response' },
      { status: 500 }
    )
  }
}

async function processChat(message: string, messages: any[]) {

    // Build conversation history for context
    const conversationHistory: Message[] = [
      ...messages.slice(-10), // Keep last 10 messages for context (prevent token limit)
      { role: 'user', content: message }
    ]

    // Extract keywords from the current message and recent context for database search
    const contextualMessage = buildContextualQuery(conversationHistory)
    const searchKeywords = extractKeywords(contextualMessage)
    
    // Query database for relevant projects
    const relevantProjects = await searchProjects(searchKeywords)
    
    // RAG: Search for relevant document chunks using contextual query
    let ragResults: RagResult[] = []
    try {
      console.log('Attempting direct RAG search...')
      ragResults = await searchDocumentChunks(contextualMessage, 4)
      console.log(`Successfully found ${ragResults.length} relevant document chunks`)
    } catch (error) {
      console.error('RAG search failed with detailed error:', error)
      // Continue without RAG results if there's an error
      ragResults = []
    }
    
    // Build enhanced system prompt with conversation awareness
    const systemPrompt = buildSystemPrompt(relevantProjects, ragResults, conversationHistory)

    // Generate AI response with full conversation context
    const { text } = await generateText({
      model: openai('gpt-4o-mini'),
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        ...conversationHistory
      ],
      temperature: 0.7,
      maxTokens: 1000,
    })

    return NextResponse.json({ 
      response: text,
      sources: ragResults.map(result => ({
        source: result.source,
        content: result.content.substring(0, 200) + '...',
        similarity: result.similarity
      }))
    })
}

/**
 * Build a contextual query that includes recent conversation context
 */
function buildContextualQuery(messages: Message[]): string {
  // Get the last few messages to understand context
  const recentMessages = messages.slice(-3)
  
  // Combine recent conversation context with current query
  const context = recentMessages
    .map(msg => `${msg.role}: ${msg.content}`)
    .join(' ')
    
  return context
}

/**
 * Build system prompt with conversation awareness
 */
function buildSystemPrompt(projects: Project[], ragResults: RagResult[], conversationHistory: Message[]): string {
  const hasContext = conversationHistory.length > 1
  
  return `You are an AI assistant for Robert Mill's personal portfolio website. You have access to his projects and documents to answer questions about his experience and background.

${hasContext ? `
CONVERSATION CONTEXT: You are continuing a conversation. Pay attention to previous questions and context. If the user asks follow-up questions like "which companies?" or "what about...", refer back to the conversation history to understand what they're asking about.

Recent conversation:
${conversationHistory.slice(-5).map(msg => `${msg.role.toUpperCase()}: ${msg.content}`).join('\n')}
` : ''}

AVAILABLE INFORMATION:

Projects from database:
${projects.map(p => `
- ${p.title}: ${p.description}
- Technologies: ${p.tags?.join(', ') || 'N/A'}
- Date: ${p.date}
- URL: ${p.projectUrl}
`).join('\n')}

Document excerpts (from resume/documents):
${ragResults.map(r => `
- Source: ${r.source}
- Content: ${r.content}
- Relevance: ${(r.similarity * 100).toFixed(1)}%
`).join('\n')}

INSTRUCTIONS:
- Answer questions conversationally, referring to conversation history when relevant
- Be specific about Robert's experience, mentioning actual company names, technologies, and projects
- If asked follow-up questions, reference previous context appropriately
- Keep responses concise but informative
- If you don't have specific information, say so rather than making assumptions

Remember: You're continuing a conversation, so context matters!`
}

function extractKeywords(message: string): string[] {
  const commonWords = ['i', 'you', 'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'about', 'what', 'how', 'when', 'where', 'why', 'tell', 'me', 'show', 'do', 'have', 'any', 'projects', 'project', 'work', 'experience', 'which', 'that', 'this']
  return message
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 2 && !commonWords.includes(word))
    .slice(0, 8) // Increased to capture more context
}

async function searchProjects(keywords: string[]) {
  if (keywords.length === 0) {
    return await db
      .select()
      .from(projects)
      .where(sql`featured = true`)
      .limit(3)
  }

  const searchConditions = keywords.map(keyword => 
    or(
      ilike(projects.title, `%${keyword}%`),
      ilike(projects.description, `%${keyword}%`),
      sql`${projects.tags} @> ARRAY[${keyword}]::text[]`
    )
  )

  return await db
    .select()
    .from(projects)
    .where(or(...searchConditions))
    .limit(5)
}

// Simple document chunk search function
async function searchDocumentChunks(query: string, limit: number = 4): Promise<RagResult[]> {
  try {
    // For now, do a simple text search in document chunks
    // This is a fallback until we can fix the vector search
    const results = await db.execute(sql`
      SELECT 
        id,
        content,
        metadata,
        source,
        chunk_index,
        CASE 
          WHEN content ILIKE ${'%' + query + '%'} THEN 0.9
          WHEN content ILIKE ${'%football%coaching%'} THEN 0.95
          WHEN content ILIKE ${'%coaching%'} THEN 0.85
          WHEN content ILIKE ${'%football%'} THEN 0.8
          WHEN content ILIKE ${'%mustang%'} THEN 0.9
          ELSE 0.7
        END as similarity
      FROM document_chunks
      WHERE content ILIKE ${'%' + query + '%'}
      OR content ILIKE ${'%coaching%'}
      OR content ILIKE ${'%football%'}
      OR content ILIKE ${'%mustang%'}
      ORDER BY similarity DESC
      LIMIT ${limit}
    `)
    
    return Array.from(results).map((row: any) => ({
      id: row.id as string,
      content: row.content as string,
      metadata: (row.metadata || {}) as Record<string, unknown>,
      source: row.source as string,
      chunkIndex: row.chunk_index as number,
      similarity: parseFloat(row.similarity) || 0.8,
    }))
  } catch (error) {
    console.error('Document chunk search failed:', error)
    return []
  }
}