const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const app = express();
const PORT = process.env.PORT || 10000;

// DeepSeek API-ის კონფიგურაცია
const DEEPSEEK_API_KEY = 'sk-c3b81abe117e43c398abc72bf358ef96';
const DEEPSEEK_BASE_URL = 'https://api.deepseek.com';

// CORS მოწყობა
app.use(cors({
    origin: ['https://hematria.nextgen.ge', 'http://localhost:5500', 'http://127.0.0.1:5500', 'https://anagram-service.onrender.com'],
    methods: ['GET', 'POST', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
    optionsSuccessStatus: 204
}));

app.use(express.json());

// DeepSeek-თან მოთხოვნის გაგზავნის ფუნქცია
async function callDeepSeek(prompt) {
    try {
        const response = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
            },
            body: JSON.stringify({
                model: 'deepseek-chat',
                messages: [
                    { role: 'system', content: 'You are a helpful assistant proficient in Georgian language and cryptography.' },
                    { role: 'user', content: prompt }
                ]
            })
        });

        if (!response.ok) {
            throw new Error(`DeepSeek API error! Status: ${response.status}`);
        }

        const data = await response.json();
        return data.choices[0].message.content;
    } catch (error) {
        console.error('Error calling DeepSeek API:', error);
        throw error;
    }
}

// სტატუსის შესამოწმებელი ენდპოინტი
app.get('/api/status', (req, res) => {
    res.json({
        status: 'running',
        deepSeekIntegration: true
    });
});

// ანაგრამების მოძიების ენდპოინტი DeepSeek-ის გამოყენებით
app.post('/api/find-anagrams', async (req, res) => {
    const { word } = req.body;

    if (!word || typeof word !== 'string') {
        return res.status(400).json({
            error: 'არასწორი მოთხოვნა. გთხოვთ მიუთითოთ სიტყვა.'
        });
    }

    const cleanWord = word.trim();
    if (cleanWord.length === 0) {
        return res.status(400).json({
            error: 'გთხოვთ შეიყვანოთ სიტყვა ანაგრამების მოსაძებნად.'
        });
    }

    try {
        const prompt = `მომაძებნე სიტყვა "${cleanWord}"-ის ყველა შესაძლო ანაგრამა ქართულ ენაზე. დაწერე ისინი სიის სახით.`;
        const anagramResponse = await callDeepSeek(prompt);

        // DeepSeek-ის პასუხის დამუშავება
        const anagrams = anagramResponse.split('\n')
            .map(line => line.trim())
            .filter(line => line && !line.startsWith('-') && line !== cleanWord)
            .map(anagram => ({
                word: anagram,
                type: 'exact' // DeepSeek-ის შემთხვევაში ვივარაუდოთ, რომ ყველა ზუსტია
            }));

        res.json({
            original: cleanWord,
            anagrams: anagrams
        });
    } catch (error) {
        console.error('Error finding anagrams with DeepSeek:', error);
        res.status(500).json({
            error: 'შეცდომა ანაგრამების ძიებისას DeepSeek-ის გამოყენებით'
        });
    }
});

// კრიპტოგრაფიული ანალიზის ენდპოინტი
app.post('/api/crypto-analysis', async (req, res) => {
    const { text } = req.body;

    if (!text || typeof text !== 'string') {
        return res.status(400).json({
            error: 'არასწორი მოთხოვნა. გთხოვთ მიუთითოთ ტექსტი.'
        });
    }

    try {
        const prompt = `გააანალიზე ტექსტი "${text}" ქართულ ენაზე კრიპტოგრაფიული თვალსაზრისით. მაგალითად, გამოიყენე სიხშირული ანალიზი, ცეზარის შიფრის მეთოდი ან სხვა მიდგომები.`;
        const analysis = await callDeepSeek(prompt);

        res.json({
            text: text,
            analysis: analysis
        });
    } catch (error) {
        console.error('Error in cryptographic analysis:', error);
        res.status(500).json({
            error: 'შეცდომა კრიპტოგრაფიულ ანალიზში'
        });
    }
});

// მთავარი გვერდის ენდპოინტი
app.get('/', (req, res) => {
    res.send(`
        <html>
            <head>
                <title>ანაგრამებისა და კრიპტოგრაფიის სერვისი</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
                    h1 { color: #333; }
                    .status { padding: 20px; background: #f4f4f4; border-radius: 5px; }
                    .loaded { color: green; }
                    code { background: #f0f0f0; padding: 2px 5px; border-radius: 3px; }
                </style>
            </head>
            <body>
                <h1>ანაგრამებისა და კრიპტოგრაფიის სერვისი</h1>
                <div class="status">
                    <p>სტატუსი: <strong><span class="loaded">მზადაა</span></strong></p>
                    <p>DeepSeek API: <strong>აქტიური</strong></p>
                </div>
                <h2>API დოკუმენტაცია</h2>
                <ul>
                    <li>GET <code>/api/status</code> - სერვისის სტატუსის შემოწმება</li>
                    <li>POST <code>/api/find-anagrams</code> - ანაგრამების ძიება (JSON: {"word": "სიტყვა"})</li>
                    <li>POST <code>/api/crypto-analysis</code> - კრიპტოგრაფიული ანალიზი (JSON: {"text": "ტექსტი"})</li>
                </ul>
                <h2>ტესტი</h2>
                <p>მაგალითი: <a href="/api/find-anagrams" target="_blank">იპოვე ანაგრამები POST მეთოდით</a></p>
            </body>
        </html>
    `);
});

// სერვერის გაშვება
app.listen(PORT, () => {
    console.log(`სერვერი გაშვებულია პორტზე ${PORT}`);
});
