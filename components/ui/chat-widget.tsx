'use client'

import { useState, useRef, useEffect } from 'react'
import { MessageCircle, Send, X, Bot, User, Minimize2 } from 'lucide-react'
import {
  Box,
  Text,
  VStack,
  HStack,
  Textarea,
  IconButton,
  Avatar,
  useColorModeValue,
  Flex,
  Badge,
} from '@chakra-ui/react'
import ReactMarkdown from 'react-markdown'
import rehypeHighlight from 'rehype-highlight'
import 'highlight.js/styles/github.css'
import { ReactNode } from 'react'

// Types for markdown components
interface MarkdownComponentProps {
  children: ReactNode
}

interface CodeComponentProps extends MarkdownComponentProps {
  className?: string
}

interface LinkComponentProps extends MarkdownComponentProps {
  href?: string
}

interface ChatSource {
  source: string
  content: string
  similarity: number
  chunkIndex: number
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources?: ChatSource[]
  timestamp: Date
}

// Custom markdown components for styled rendering
const MarkdownComponents: any = {
  p: ({ children }: MarkdownComponentProps) => (
    <Text mb="2" lineHeight="1.6">
      {children}
    </Text>
  ),
  strong: ({ children }: MarkdownComponentProps) => (
    <Text as="strong" fontWeight="semibold" color="rgba(45, 41, 38, 0.9)">
      {children}
    </Text>
  ),
  em: ({ children }: MarkdownComponentProps) => (
    <Text as="em" fontStyle="italic">
      {children}
    </Text>
  ),
  ul: ({ children }: MarkdownComponentProps) => (
    <Box as="ul" pl="4" mb="2">
      {children}
    </Box>
  ),
  ol: ({ children }: MarkdownComponentProps) => (
    <Box as="ol" pl="4" mb="2">
      {children}
    </Box>
  ),
  li: ({ children }: MarkdownComponentProps) => (
    <Box as="li" mb="1" lineHeight="1.5">
      {children}
    </Box>
  ),
  code: ({ children, className }: CodeComponentProps) => {
    const isInline = !className
    return isInline ? (
      <Text
        as="code"
        bg="rgba(160, 139, 115, 0.1)"
        color="rgba(45, 41, 38, 0.9)"
        px="1"
        py="0.5"
        borderRadius="4px"
        fontSize="sm"
        fontFamily="'JetBrains Mono', monospace"
      >
        {children}
      </Text>
    ) : (
      <Box
        as="pre"
        bg="rgba(247, 243, 233, 0.8)"
        border="1px solid rgba(212, 197, 169, 0.3)"
        borderRadius="6px"
        p="3"
        mb="2"
        overflow="auto"
        fontSize="sm"
        fontFamily="'JetBrains Mono', monospace"
      >
        <Text as="code" color="rgba(45, 41, 38, 0.9)">
          {children}
        </Text>
      </Box>
    )
  },
  blockquote: ({ children }: MarkdownComponentProps) => (
    <Box
      borderLeft="4px solid rgba(160, 139, 115, 0.4)"
      pl="4"
      py="2"
      mb="2"
      bg="rgba(247, 243, 233, 0.3)"
      borderRadius="0 6px 6px 0"
    >
      {children}
    </Box>
  ),
  h1: ({ children }: MarkdownComponentProps) => (
    <Text fontSize="lg" fontWeight="semibold" mb="2" color="rgba(45, 41, 38, 0.9)">
      {children}
    </Text>
  ),
  h2: ({ children }: MarkdownComponentProps) => (
    <Text fontSize="md" fontWeight="semibold" mb="2" color="rgba(45, 41, 38, 0.9)">
      {children}
    </Text>
  ),
  h3: ({ children }: MarkdownComponentProps) => (
    <Text fontSize="sm" fontWeight="semibold" mb="1" color="rgba(45, 41, 38, 0.9)">
      {children}
    </Text>
  ),
  a: ({ children, href }: LinkComponentProps) => (
    <Text
      as="a"
      href={href}
      color="rgba(160, 139, 115, 0.9)"
      textDecoration="underline"
      _hover={{ color: 'rgba(45, 41, 38, 0.9)' }}
    >
      {children}
    </Text>
  ),
}

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [isMinimized, setIsMinimized] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Hi! I'm here to help you learn more about Berto's projects and AI expertise. What would you like to know?",
      timestamp: new Date()
    }
  ])
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Color mode values - matching architectural minimalist theme
  const chatBg = useColorModeValue('rgba(255, 255, 255, 0.85)', 'rgba(45, 41, 38, 0.85)')
  const borderColor = useColorModeValue('rgba(212, 197, 169, 0.3)', 'rgba(160, 139, 115, 0.3)')
  const messagesBg = useColorModeValue('rgba(247, 243, 233, 0.4)', 'rgba(45, 41, 38, 0.6)')
  const inputBg = useColorModeValue('rgba(255, 255, 255, 0.8)', 'rgba(45, 41, 38, 0.8)')
  const inputBorder = useColorModeValue('rgba(212, 197, 169, 0.4)', 'rgba(160, 139, 115, 0.4)')

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const sendMessage = async (userMessage: string) => {
    if (!userMessage.trim()) return

    // Add user message
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: userMessage,
      timestamp: new Date()
    }
    setMessages(prev => [...prev, userMsg])
    setMessage('')
    setIsLoading(true)

    try {
      // Build conversation history for API (exclude the current user message since we'll send it separately)
      const conversationHistory = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }))

      // Add timeout to prevent hanging requests
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          message: userMessage,
          messages: conversationHistory // Send conversation history to maintain context
        }),
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error('Failed to send message')
      }

      const data = await response.json()

      // Add assistant response
      const assistantMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response,
        sources: data.sources,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, assistantMsg])
    } catch (error: any) {
      console.error('Error sending message:', error)
      
      // Enhanced error handling with specific messages
      let errorContent = "Sorry, I'm having trouble connecting right now. Please try again later."
      
      if (error.message?.includes('timeout') || error.name === 'TimeoutError') {
        errorContent = "The request timed out. Please try asking a shorter question or try again later."
      } else if (error.message?.includes('Failed to fetch')) {
        errorContent = "Network connection issue. Please check your internet and try again."
      } else if (error.message?.includes('504')) {
        errorContent = "The server is taking longer than expected. Please try again in a moment."
      }
      
      // Add error message
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: errorContent,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMsg])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    sendMessage(message)
  }

  return (
    <Box position="fixed" bottom="6" right="6" zIndex="50">
      {/* Chat Button */}
      <IconButton
        aria-label="Open chat"
        icon={<MessageCircle size={28} />}
        isRound
        size="lg"
        w="16"
        h="16"
        color="white"
        bgGradient="linear(135deg, #a08b73 0%, #2d2926 100%)"
        _hover={{
          transform: 'scale(1.05)',
          boxShadow: '0 12px 40px rgba(160, 139, 115, 0.4)'
        }}
        transition="all 0.3s ease"
        boxShadow="0 8px 32px rgba(160, 139, 115, 0.3)"
        onClick={() => setIsOpen(!isOpen)}
        opacity={isOpen ? 0 : 1}
        transform={isOpen ? 'scale(0.9)' : 'scale(1)'}
        pointerEvents={isOpen ? 'none' : 'auto'}
        position="relative"
      >
        {/* Notification dot */}
        <Box
          position="absolute"
          top="-1"
          right="-1"
          w="4"
          h="4"
          bg="red.500"
          borderRadius="full"
          display="flex"
          alignItems="center"
          justifyContent="center"
        >
          <Box
            w="2"
            h="2"
            bg="white"
            borderRadius="full"
            css={{
              animation: "pulse 2s infinite"
            }}
          />
        </Box>
      </IconButton>

      {/* Chat Window */}
      <Box
        w="96"
        h={isMinimized ? "16" : "500px"}
        bg={chatBg}
        borderRadius="8px"
        boxShadow="0 25px 50px rgba(45, 41, 38, 0.15)"
        border="1px"
        borderColor={borderColor}
        overflow="hidden"
        transition="all 0.3s ease"
        opacity={isOpen ? 1 : 0}
        transform={isOpen ? 'scale(1)' : 'scale(0.95)'}
        pointerEvents={isOpen ? 'auto' : 'none'}
        transformOrigin="bottom right"
        position="absolute"
        bottom="20"
        right="0"
        backdropFilter="blur(25px)"
        className="glass-effect"
      >
        {/* Header */}
        <Box
          bgGradient="linear(135deg, #a08b73 0%, #2d2926 100%)"
          p="4"
          borderTopRadius="8px"
        >
          <Flex justify="space-between" align="center">
            <HStack spacing="3">
              <Avatar
                size="sm"
                bg="whiteAlpha.200"
                icon={<Bot size={20} />}
                color="white"
              />
              <VStack align="start" spacing="0">
                <Text fontSize="sm" fontWeight="semibold" color="white">
                  AI Assistant
                </Text>
                <HStack spacing="1">
                  <Box w="2" h="2" bg="rgba(232, 220, 192, 0.8)" borderRadius="full" />
                  <Text fontSize="xs" color="whiteAlpha.900">
                    Document Search
                  </Text>
                </HStack>
              </VStack>
            </HStack>
            
            <HStack spacing="1">
              <IconButton
                aria-label="Minimize chat"
                icon={<Minimize2 size={16} />}
                size="sm"
                variant="ghost"
                color="white"
                _hover={{ bg: 'whiteAlpha.200' }}
                onClick={() => setIsMinimized(!isMinimized)}
              />
              <IconButton
                aria-label="Close chat"
                icon={<X size={16} />}
                size="sm"
                variant="ghost"
                color="white"
                _hover={{ bg: 'whiteAlpha.200' }}
                onClick={() => setIsOpen(false)}
              />
            </HStack>
          </Flex>
        </Box>
        
        {!isMinimized && (
          <>
            {/* Messages */}
            <Box
              flex="1"
              overflowY="auto"
              p="4"
              bg={messagesBg}
              maxH="340px"
            >
              <VStack spacing="4" align="stretch">
                {messages.map((msg) => (
                  <Flex
                    key={msg.id}
                    justify={msg.role === 'user' ? 'flex-end' : 'flex-start'}
                    align="flex-start"
                  >
                    {msg.role === 'assistant' && (
                      <Avatar
                        size="sm"
                        bg="rgba(160, 139, 115, 0.8)"
                        icon={<Bot size={16} />}
                        color="white"
                        mr="3"
                        flexShrink="0"
                      />
                    )}
                    
                    <VStack align={msg.role === 'user' ? 'flex-end' : 'flex-start'} spacing="2" maxW="75%">
                      <Box
                        p="3"
                        borderRadius="8px"
                        fontSize="sm"
                        lineHeight="relaxed"
                        bg={msg.role === 'user' ? 'rgba(160, 139, 115, 0.9)' : 'rgba(255, 255, 255, 0.9)'}
                        color={msg.role === 'user' ? 'white' : 'rgba(45, 41, 38, 0.9)'}
                        borderBottomLeftRadius={msg.role === 'assistant' ? '4px' : '8px'}
                        borderBottomRightRadius={msg.role === 'user' ? '4px' : '8px'}
                        boxShadow="0 4px 15px rgba(45, 41, 38, 0.05)"
                        border={msg.role === 'assistant' ? '1px' : 'none'}
                        borderColor="rgba(212, 197, 169, 0.2)"
                        backdropFilter="blur(10px)"
                      >
                        {msg.role === 'assistant' ? (
                          <ReactMarkdown
                            components={MarkdownComponents}
                            rehypePlugins={[rehypeHighlight]}
                          >
                            {msg.content}
                          </ReactMarkdown>
                        ) : (
                          msg.content
                        )}
                      </Box>
                      
                      {/* Sources */}
                      {msg.sources && msg.sources.length > 0 && (
                        <Box
                          w="full"
                          bg="rgba(247, 243, 233, 0.8)"
                          border="1px"
                          borderColor="rgba(212, 197, 169, 0.3)"
                          borderRadius="6px"
                          p="3"
                          fontSize="xs"
                          backdropFilter="blur(10px)"
                        >
                          <Text fontWeight="semibold" mb="2" color="rgba(45, 41, 38, 0.8)">
                            Sources ({msg.sources.length})
                          </Text>
                          <VStack spacing="2" align="stretch">
                            {msg.sources.map((source, index) => (
                              <Box key={index}>
                                <HStack justify="space-between">
                                  <Text color="rgba(45, 41, 38, 0.7)" fontWeight="medium">
                                    📄 {source.source}
                                  </Text>
                                  <Badge 
                                    bg="rgba(160, 139, 115, 0.2)" 
                                    color="rgba(45, 41, 38, 0.8)"
                                    size="sm"
                                    borderRadius="4px"
                                  >
                                    {Math.round(source.similarity * 100)}% match
                                  </Badge>
                                </HStack>
                                <Text color="rgba(45, 41, 38, 0.6)" noOfLines={2}>
                                  {source.content}
                                </Text>
                              </Box>
                            ))}
                          </VStack>
                        </Box>
                      )}
                    </VStack>
                    
                    {msg.role === 'user' && (
                      <Avatar
                        size="sm"
                        bg="rgba(212, 197, 169, 0.6)"
                        icon={<User size={16} />}
                        color="rgba(45, 41, 38, 0.8)"
                        ml="3"
                        flexShrink="0"
                      />
                    )}
                  </Flex>
                ))}
                
                {/* Loading indicator */}
                {isLoading && (
                  <Flex align="flex-start">
                    <Avatar
                      size="sm"
                      bg="rgba(160, 139, 115, 0.8)"
                      icon={<Bot size={16} />}
                      color="white"
                      mr="3"
                      flexShrink="0"
                    />
                    <Box
                      bg="rgba(255, 255, 255, 0.9)"
                      p="3"
                      borderRadius="8px"
                      borderBottomLeftRadius="4px"
                      boxShadow="0 4px 15px rgba(45, 41, 38, 0.05)"
                      border="1px"
                      borderColor="rgba(212, 197, 169, 0.2)"
                      backdropFilter="blur(10px)"
                    >
                      <HStack spacing="1">
                        <Box
                          w="2"
                          h="2"
                          bg="rgba(160, 139, 115, 0.6)"
                          borderRadius="full"
                          css={{
                            animation: "bounce 1s infinite"
                          }}
                        />
                        <Box
                          w="2"
                          h="2"
                          bg="rgba(160, 139, 115, 0.6)"
                          borderRadius="full"
                          css={{
                            animation: "bounce 1s infinite",
                            animationDelay: "0.1s"
                          }}
                        />
                        <Box
                          w="2"
                          h="2"
                          bg="rgba(160, 139, 115, 0.6)"
                          borderRadius="full"
                          css={{
                            animation: "bounce 1s infinite",
                            animationDelay: "0.2s"
                          }}
                        />
                      </HStack>
                    </Box>
                  </Flex>
                )}
                <div ref={messagesEndRef} />
              </VStack>
            </Box>

            {/* Input */}
            <Box p="4" borderTop="1px" borderColor={borderColor} bg={chatBg}>
              <form onSubmit={handleSendMessage}>
                <HStack spacing="2" align="flex-end">
                  <Textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Ask me about AI, projects, or anything..."
                    bg={inputBg}
                    border="1px"
                    borderColor={inputBorder}
                    borderRadius="8px"
                    _focus={{
                      outline: 'none',
                      borderColor: 'rgba(160, 139, 115, 0.6)',
                      boxShadow: '0 0 0 2px rgba(160, 139, 115, 0.2)'
                    }}
                    fontSize="sm"
                    isDisabled={isLoading}
                    resize="none"
                    minH="40px"
                    maxH="120px"
                    rows={1}
                    backdropFilter="blur(10px)"
                    color="rgba(45, 41, 38, 0.9)"
                    _placeholder={{
                      color: 'rgba(45, 41, 38, 0.5)'
                    }}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleSendMessage(e)
                      }
                    }}
                  />
                  <IconButton
                    type="submit"
                    aria-label="Send message"
                    icon={<Send size={16} />}
                    bgGradient="linear(135deg, #a08b73 0%, #2d2926 100%)"
                    color="white"
                    _hover={{
                      bgGradient: 'linear(135deg, #2d2926 0%, #a08b73 100%)',
                      boxShadow: '0 4px 15px rgba(160, 139, 115, 0.3)'
                    }}
                    borderRadius="8px"
                    isDisabled={!message.trim() || isLoading}
                    isLoading={isLoading}
                    flexShrink={0}
                  />
                </HStack>
              </form>
              
              <Text fontSize="xs" color="rgba(45, 41, 38, 0.6)" textAlign="center" mt="2">
                Document Search AI • Press Enter to send • Shift+Enter for new line
              </Text>
            </Box>
          </>
        )}
      </Box>
    </Box>
  )
}