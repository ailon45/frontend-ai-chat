/**
 * Puter.js LLM Integration
 * 
 * This module handles LLM calls using Puter.js directly in the browser.
 * Make sure to include Puter.js in your HTML.
 * 
 * Installation:
 * Add to your HTML: <script src="https://js.puter.com/v2/"></script>
 */

// Type declaration for Puter
declare global {
  interface Window {
    puter: {
      ai: {
        chat: (prompt: string | any[], options?: any) => Promise<any>;
      };
    };
  }
}

/**
 * Call LLM using Puter.js
 * @param prompt - The prompt to send to the LLM
 * @param options - Optional configuration (model, temperature, etc.)
 * @returns The LLM response as a string
 */
export async function callLLM(
  prompt: string,
  options?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  }
): Promise<string> {
  try {
    // Check if Puter is available
    if (typeof window === 'undefined' || !window.puter) {
      throw new Error('Puter.js is not loaded. Please include the Puter.js script.');
    }

    // Prepare options for Puter.js API
    const puterOptions: any = {};

    if (options?.model) {
      puterOptions.model = options.model;
    }

    if (options?.temperature !== undefined) {
      puterOptions.temperature = options.temperature;
    }

    if (options?.maxTokens) {
      puterOptions.max_tokens = options.maxTokens;
    }

    // Call Puter AI - response is a ChatResponse object
    const response = await window.puter.ai.chat(prompt, puterOptions);

    // Extract text from response
    // Response structure: { message: { role: "assistant", content: "..." } }

    // Handle Claude's content array format
    if (response?.message?.content) {
      const content = response.message.content;

      // If content is an array (Claude format), extract text from blocks
      if (Array.isArray(content)) {
        const textBlocks = content
          .filter((block: any) => block.type === 'text')
          .map((block: any) => block.text);
        if (textBlocks.length > 0) {
          return textBlocks.join('\n');
        }
      }

      // If content is a string (GPT format)
      if (typeof content === 'string') {
        return content;
      }

      // If content is an object, try to stringify it
      console.warn('Unexpected content format:', content);
      return String(content);
    }

    // Fallback: try other common properties
    if (typeof response === 'string') {
      return response;
    }

    if (response?.text) {
      return String(response.text);
    }

    if (response?.content) {
      return String(response.content);
    }

    // Last resort - log for debugging
    console.error('Could not extract text from response:', response);
    console.error('Response structure:', JSON.stringify(response, null, 2));
    throw new Error('Unexpected response format from Puter.js');
  } catch (error: any) {
    console.error('Error calling Puter LLM:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    if (error?.error) {
      console.error('Nested error:', error.error);
    }
    throw new Error(`Failed to get response from LLM: ${error?.error?.message || error?.message || 'Unknown error'}`);
  }
}

/**
 * Stream LLM response using Puter.js
 * @param prompt - The prompt to send to the LLM
 * @param onChunk - Callback for each chunk of the response
 * @param options - Optional configuration
 */
export async function streamLLM(
  prompt: string,
  onChunk: (chunk: string) => void,
  options?: {
    model?: string;
  }
): Promise<void> {
  try {
    if (typeof window === 'undefined' || !window.puter) {
      throw new Error('Puter.js is not loaded. Please include the Puter.js script.');
    }

    const puterOptions: any = { stream: true };
    if (options?.model) {
      puterOptions.model = options.model;
    }

    const response = await window.puter.ai.chat(prompt, puterOptions);

    // Iterate through the async iterable
    for await (const part of response) {
      if (part?.text) {
        onChunk(part.text);
      }
    }
  } catch (error) {
    console.error('Error streaming from Puter LLM:', error);
    throw new Error('Failed to stream response from LLM. Please try again.');
  }
}
