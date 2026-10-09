import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

async function checkModels() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('No GEMINI_API_KEY found in .env');
    return;
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // In older version of the SDK, genAI.listModels() might not be a function, 
    // but in newer versions it is supported. Let's see:
    console.log('Fetching available models for your Gemini API key...');
    // We can list models using a standard model endpoint check or listModels
    // Let's call listModels if it exists.
    
    // If listModels is not direct, let's try a simple test with different model names
    const modelsToTry = [
      'gemini-1.5-flash',
      'gemini-1.5-flash-latest',
      'gemini-1.5-pro',
      'gemini-pro'
    ];

    for (const modelName of modelsToTry) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent('Hi');
        console.log(`✅ Model "${modelName}" is working! Response:`, result.response.text().trim());
      } catch (err) {
        console.log(`❌ Model "${modelName}" failed:`, err.message);
      }
    }
  } catch (err) {
    console.error('General SDK check failed:', err);
  }
}

checkModels();
