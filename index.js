const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const app = express();
const PORT = process.env.PORT || 10000;

// DeepSeek API-ის კონფიგურაცია
const DEEPSEEK_API_KEY = 'sk-c3b81abe117e43c398abc72bf358ef96';
const DEEPSEEK_BASE_URL = 'https://api.deepseek.com';

// CORS-ის კონფიგურაცია - დავუშვათ მხოლოდ hematria.nextgen.ge
const corsOptions = {
    origin: 'https://hematria.nextgen.ge',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    optionsSuccessStatus: 204
};

app.use(cors(corsOptions));
app.use(express.json());

// Preflight მოთხოვნების ხელით მართვა (დამატებითი უზრუნველყოფა)
app.options('*', cors(corsOptions));

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

        if (!response.ok) throw new Error(`DeepSeek API error! Status: ${response.status}`);
        const data = await response.json();
        return data.choices[0].message.content;
    } catch (error) {
        console.error('Error calling DeepSeek API:', error);
        throw error;
    }
}

// ანაგრამების მოძიების ენდპოინტი
app.post('/api/find-anagrams', async (req, res) => {
    const { word } = req.body;

    if (!word || typeof word !== 'string') {
        return res.status(400).json({ error: 'გთხოვთ მიუთითოთ სიტყვა.' });
    }

    const cleanWord = word.trim();
    if (!cleanWord) {
        return res.status(400).json({ error: 'შეიყვანეთ სიტყვა.' });
    }

    try {
        const prompt = `მომაძებნე სიტყვა "${cleanWord}"-ის ყველა შესაძლო ანაგრამა ქართულ ენაზე. დაწერე ისინი სიის სახით.`;
        const anagramResponse = await callDeepSeek(prompt);

        const anagrams = anagramResponse.split('\n')
            .map(line => line.trim())
            .filter(line => line && !line.startsWith('-') && line !== cleanWord)
            .map(anagram => ({ word: anagram, type: 'exact' }));

        res.json({ original: cleanWord, anagrams });
    } catch (error) {
        res.status(500).json({ error: 'შეცდომა ანაგრამების ძიებისას' });
    }
});

// კრიპტოგრაფიული ანალიზის ენდპოინტი
app.post('/api/crypto-analysis', async (req, res) => {
    const { text } = req.body;

    if (!text || typeof text !== 'string') {
        return res.status(400).json({ error: 'გთხოვთ მიუთითოთ ტექსტი.' });
    }

    try {
        const prompt = `გააანალიზე ტექსტი "${text}" ქართულ ენაზე კრიპტოგრაფიული თვალსაზრისით. გამოიყენე სიხშირული ანალიზი ან სხვა მეთოდები.`;
        const analysis = await callDeepSeek(prompt);

        res.json({ text, analysis });
    } catch (error) {
        res.status(500).json({ error: 'შეცდომა კრიპტოგრაფიულ ანალიზში' });
    }
});

// სტატუსის ენდპოინტი
app.get('/api/status', (req, res) => {
    res.json({ status: 'running', deepSeekIntegration: true });
});

// ძირითადი გვერდი (დიაგნოსტიკისთვის)
app.get('/', (req, res) => {
    res.send('API is running. Use /api/find-anagrams or /api/crypto-analysis');
});

app.listen(PORT, () => {
    console.log(`სერვერი გაშვებულია პორტზე ${PORT}`);
});
