// Simple token counter utility for estimating Gemini API payload size
class TokenCounter {
  // Simple estimation: 1 token ~ 4 characters or 0.75 words
  static estimateTokens(text) {
    if (!text || typeof text !== 'string') {
      return 0;
    }
    
    // Count words - roughly 1.33 tokens per word (or 0.75 words per token)
    const wordCount = text.trim().split(/\s+/).filter(word => word.length > 0).length;
    
    // Count characters
    const charCount = text.length;
    
    // Estimate tokens using multiple methods and return average
    // Method 1: 1 token per 4 characters
    const tokensFromChars = Math.ceil(charCount / 4);
    // Method 2: 1 token per 0.75 words
    const tokensFromWords = Math.ceil(wordCount * 1.33);
    
    // Use the more conservative (higher) estimate to be safe
    return Math.max(tokensFromChars, tokensFromWords);
  }

  static countTokensInApiCall(content, initialContentText, requirements) {
    // Format the prompt similar to how geminiService.js does it
    const reqList = requirements ? requirements.join('\n- ') : 'No specific requirements provided';
    const initialContent = initialContentText ? `"${initialContentText}"` : 'None provided';

    const prompt = `You are an academic writing assistant. Evaluate the following content based on the requirements provided. Give detailed feedback and suggestions for improvement.

INSTRUCTIONS: Respond in JSON format with the following structure only:
{
  "evaluation": {
    "overallAssessment": "string",
    "strengths": ["string"],
    "improvements": ["string"],
    "complianceWithRequirements": "string",
    "feedbackOnContentQuality": "string",
    "suggestionsForEnhancement": ["string"]
  }
}

Content to evaluate:
"${content}"

Initial Content Text (for reference):
${initialContent}

Requirements:
- ${reqList}

Please provide your assessment based on the requirements and guidelines.`;

    return {
      contentTokens: this.estimateTokens(content),
      initialContentTokens: this.estimateTokens(initialContentText),
      requirementsTokens: this.estimateTokens(reqList),
      promptTokens: this.estimateTokens(prompt),
      totalTokens: this.estimateTokens(prompt)
    };
  }
}

export default TokenCounter;