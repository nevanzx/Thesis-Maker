// Test script to calculate token count for chapter-0.block-0
import TokenCounter from './tokenCounter';

// Content from thesis-content.json for chapter-0.block-0
const content = "Financial literacy refers to the knowledge and skills that enable individuals to make informed and effective decisions about their financial resources. It includes understanding essential concepts such as budgeting, saving, investing, managing credit, and evaluating financial risks. A financially literate person can plan for short-term and long-term goals, avoid excessive debt, and make choices that support financial stability and independence. By developing strong financial literacy skills, individuals can navigate increasingly complex financial systems, protect themselves from fraud, and build a secure future through responsible money management.";

// Initial content text from the guide (Chapter 1-2 1IVDV.json)
const initialContentText = "Introduction to the Topic";

// Requirements from the guide
const requirements = [
  " Must be in third person. Clearly state the problematic issues on [Insert DV] in Global, National, & Local Context,  At least 2 authors from the RRL per paragraph."
];

console.log("Calculating token count for Gemini API call...\n");

const result = TokenCounter.countTokensInApiCall(content, initialContentText, requirements);

console.log("Token breakdown:");
console.log(`- Content tokens: ${result.contentTokens}`);
console.log(`- Initial content tokens: ${result.initialContentTokens}`);
console.log(`- Requirements tokens: ${result.requirementsTokens}`);
console.log(`- Prompt tokens (total): ${result.promptTokens}`);
console.log(`\nEstimated total tokens in API call: ${result.totalTokens}`);

// Also count characters and words for reference
console.log("\nDetailed breakdown:");
console.log(`Content character count: ${content.length}`);
console.log(`Content word count: ${content.trim().split(/\s+/).filter(word => word.length > 0).length}`);
console.log(`Initial content character count: ${initialContentText.length}`);
console.log(`Initial content word count: ${initialContentText.split(/\s+/).filter(word => word.length > 0).length}`);
console.log(`Requirements character count: ${requirements[0].length}`);
console.log(`Requirements word count: ${requirements[0].split(/\s+/).filter(word => word.length > 0).length}`);

// Show part of the prompt to see what's being sent
console.log("\nFirst 300 characters of the prompt being sent:");
console.log(result.promptTokens > 0 ? 
  `You are an academic writing assistant. Evaluate the following content based on the requirements provided... [truncated]` : 
  "Prompt was empty");