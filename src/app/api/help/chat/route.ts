import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { HELP_BOT_SYSTEM_PROMPT } from '@/lib/help/context';

// Rate limiting - simple in-memory store (resets on deployment)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 10; // requests per minute
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute in ms

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitStore.get(ip);

  if (!record || now > record.resetTime) {
    rateLimitStore.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (record.count >= RATE_LIMIT) {
    return false;
  }

  record.count++;
  return true;
}

// Clean up old rate limit records periodically
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of rateLimitStore.entries()) {
    if (now > record.resetTime) {
      rateLimitStore.delete(ip);
    }
  }
}, 60 * 1000); // Clean every minute

export async function POST(request: NextRequest) {
  try {
    // Check for API key
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'AI help is not configured' },
        { status: 503 }
      );
    }

    // Get client IP for rate limiting
    const forwardedFor = request.headers.get('x-forwarded-for');
    const ip = forwardedFor?.split(',')[0] || 'unknown';

    // Check rate limit
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait a moment before asking another question.' },
        { status: 429 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { message, history = [] } = body;

    // Validate message
    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Limit message length
    if (message.length > 500) {
      return NextResponse.json(
        { error: 'Message is too long. Please keep questions under 500 characters.' },
        { status: 400 }
      );
    }

    // Limit history to last 10 messages to save tokens
    const trimmedHistory = history.slice(-10);

    // Build messages array
    const messages: Anthropic.MessageParam[] = [
      ...trimmedHistory.map((msg: { role: 'user' | 'assistant'; content: string }) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })),
      {
        role: 'user' as const,
        content: message,
      },
    ];

    // Create Anthropic client
    const anthropic = new Anthropic({
      apiKey,
    });

    // Call Claude Haiku
    const response = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 1024,
      system: HELP_BOT_SYSTEM_PROMPT,
      messages,
    });

    // Extract response text
    const responseText = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('\n');

    return NextResponse.json({
      response: responseText,
      usage: {
        input_tokens: response.usage.input_tokens,
        output_tokens: response.usage.output_tokens,
      },
    });
  } catch (error) {
    console.error('Help chat error:', error);

    // Handle specific Anthropic errors
    if (error instanceof Anthropic.APIError) {
      if (error.status === 401) {
        return NextResponse.json(
          { error: 'AI service authentication failed' },
          { status: 503 }
        );
      }
      if (error.status === 429) {
        return NextResponse.json(
          { error: 'AI service is busy. Please try again in a moment.' },
          { status: 429 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to get response. Please try again.' },
      { status: 500 }
    );
  }
}

// GET endpoint to check if help is available
export async function GET() {
  const isConfigured = !!process.env.ANTHROPIC_API_KEY;
  return NextResponse.json({
    available: isConfigured,
    suggestedQuestions: isConfigured ? [
      "What is GP2?",
      "How do I sync orders?",
      "What is MER?",
      "How do I exclude a test order?",
    ] : [],
  });
}
