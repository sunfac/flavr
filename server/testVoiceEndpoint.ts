// Test script to verify voice endpoint functionality
import { GoogleGenAI } from '@google/genai';

async function testVoiceCapabilities() {
  try {
    console.log('🧪 Testing Google GenAI package capabilities...');
    
    const genai = new GoogleGenAI({ 
      apiKey: process.env.GEMINI_API_KEY || 'test'
    });
    
    console.log('📦 GenAI instance created');
    console.log('🔍 Checking for live property:', !!genai.live);
    console.log('🔍 Live API type:', typeof genai.live);
    
    if (genai.live) {
      console.log('🔍 Live connect function:', typeof genai.live.connect);
    }
    
    // Test regular text generation
    const model = genai.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
    const result = await model.generateContent('Hello, can you help with cooking?');
    console.log('✅ Text generation works:', result.response.text().substring(0, 100));
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testVoiceCapabilities();