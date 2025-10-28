// test-huggingface.js
import axios from 'axios';

async function testHuggingFace() {
  const apiKey = process.env.HUGGINGFACE_API_KEY;
  
  try {
    const response = await axios.post(
      'https://router.huggingface.co/v1/chat/completions',
      {
        messages: [
          {
            role: 'system',
            content: 'You are an expert code generator. Output ONLY the script code with no explanations.'
          },
          {
            role: 'user',
            content: 'Generate a Python script to print "Hello World"'
          }
        ],
        model: 'deepseek-ai/DeepSeek-R1',
        max_tokens: 200,
        temperature: 0.1
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('Response:', JSON.stringify(response.data, null, 2));
    
    if (response.data.choices && response.data.choices.length > 0) {
      const content = response.data.choices[0].message?.content;
      console.log('Generated content:', content);
    }
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

testHuggingFace();