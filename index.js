const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch'); // Ensure node-fetch is properly imported
const app = express();
const PORT = process.env.PORT || 10000;

// CORS მოწყობა
app.use(cors({
    origin: ['https://hematria.nextgen.ge', 'http://localhost:5500', 'http://127.0.0.1:5500', 'https://anagram-service.onrender.com'],
    methods: ['GET', 'POST', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
    optionsSuccessStatus: 204
}));

app.use(express.json());

// სიტყვების ბაზა
let wordList = new Set();
let wordListLoaded = false;
let isLoadingWordList = false;

// სიტყვების დახარისხების ფუნქცია
function sortWord(word) {
    return word.split('').sort().join('');
}

// ბაზის ჩატვირთვის ფუნქცია
async function loadWordList() {
    if (isLoadingWordList) return;

    isLoadingWordList = true;
    console.log('დაიწყო სიტყვების ბაზის ჩატვირთვა...');

    try {
        console.log('ჩაიტვირთება GitHub-იდან wordsChunk_0.txt');
        
        // Using node-fetch explicitly
        const response = await fetch('https://github.com/tsotnekverselava/hematria/raw/refs/heads/anagram-service/data/wordsChunk_0.txt.txt');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.text();
        const words = data.split('\n')
            .map(word => word.trim())
            .filter(word => word && word.length > 1); // დავტოვოთ მხოლოდ ვალიდური სიტყვები

        words.forEach(word => wordList.add(word));

        console.log(`ჩაიტვირთა ${wordList.size} სიტყვა GitHub-იდან`);
        wordListLoaded = true;
    } catch (error) {
        console.error('შეცდომა სიტყვების ბაზის ჩატვირთვისას:', error);
        // თუ GitHub-იდან ჩატვირთვა ვერ მოხერხდა, გამოვიყენოთ მინიმალური ლექსიკონი
        const sampleWords = [
            'სახლი', 'ხლისა', 'ლისახ',
            'კარი', 'რაკი', 'რიკა',
            'წყალი', 'ლიწყა', 'ყალიწ',
            'მთვარე', 'რემთვა', 'თვარემ',
            'მზე', 'ზემ',
            'ქართული', 'თულიქარ', 'ლიქართუ'
        ];

        sampleWords.forEach(word => wordList.add(word));
        console.log(`შეიქმნა მინიმალური ლექსიკონი ${wordList.size} სიტყვით`);
        wordListLoaded = true;
    } finally {
        isLoadingWordList = false;
    }
}

// სერვერის გაშვებისას ჩავტვირთოთ ბაზა
loadWordList();

// სტატუსის შესამოწმებელი ენდპოინტი
app.get('/api/status', (req, res) => {
    res.json({
        status: 'running',
        dictionaryLoaded: wordListLoaded,
        wordCount: wordList.size
    });
});

// ანაგრამების მოძიების ენდპოინტი
app.route('/api/find-anagrams')
    .post((req, res) => {
        if (!wordListLoaded) {
            return res.status(503).json({
                error: 'სერვისი ჯერ მზად არ არის. სიტყვების ბაზა იტვირთება.'
            });
        }

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
            const inputSorted = sortWord(cleanWord);
            const results = [];

            wordList.forEach(dictWord => {
                // ზუსტი ანაგრამების შემოწმება
                if (dictWord !== cleanWord && dictWord.length === cleanWord.length) {
                    if (sortWord(dictWord) === inputSorted) {
                        results.push({
                            word: dictWord,
                            type: "exact"
                        });
                    }
                }
                // ანაგრამა დასაწყისში
                else if (dictWord !== cleanWord && dictWord.length > cleanWord.length) {
                    // მოვძებნოთ სიტყვის დასაწყისი, რომელიც შეყვანილი სიტყვის სიგრძისაა
                    const prefix = dictWord.substring(0, cleanWord.length);
                    
                    // შევამოწმოთ, არის თუ არა პრეფიქსი ჩვენი სიტყვის ანაგრამა
                    if (sortWord(prefix) === inputSorted) {
                        const suffix = dictWord.substring(cleanWord.length);
                        results.push({
                            word: dictWord,
                            match: `${prefix}-${suffix}`,
                            type: "prefix"
                        });
                    }
                }
            });

            res.json({
                original: cleanWord,
                anagrams: results
            });

        } catch (error) {
            console.error('შეცდომა ანაგრამების ძიებისას:', error);
            res.status(500).json({
                error: 'შეცდომა ანაგრამების ძიებისას'
            });
        }
    })
    .get((req, res) => {
        const word = req.query.word;

        if (!word) {
            return res.status(400).json({
                error: 'გთხოვთ მიუთითოთ word პარამეტრი'
            });
        }

        if (!wordListLoaded) {
            return res.status(503).json({
                error: 'სერვისი ჯერ მზად არ არის. სიტყვების ბაზა იტვირთება.'
            });
        }

        try {
            const inputSorted = sortWord(word);
            const results = [];

            wordList.forEach(dictWord => {
                // ზუსტი ანაგრამების შემოწმება
                if (dictWord !== word && dictWord.length === word.length) {
                    if (sortWord(dictWord) === inputSorted) {
                        results.push({
                            word: dictWord,
                            type: "exact"
                        });
                    }
                }
                // ანაგრამა დასაწყისში
                else if (dictWord !== word && dictWord.length > word.length) {
                    // მოვძებნოთ სიტყვის დასაწყისი, რომელიც შეყვანილი სიტყვის სიგრძისაა
                    const prefix = dictWord.substring(0, word.length);
                    
                    // შევამოწმოთ, არის თუ არა პრეფიქსი ჩვენი სიტყვის ანაგრამა
                    if (sortWord(prefix) === inputSorted) {
                        const suffix = dictWord.substring(word.length);
                        results.push({
                            word: dictWord,
                            match: `${prefix}-${suffix}`,
                            type: "prefix"
                        });
                    }
                }
            });

            res.json({
                original: word,
                anagrams: results
            });

        } catch (error) {
            console.error('შეცდომა ანაგრამების ძიებისას:', error);
            res.status(500).json({
                error: 'შეცდომა ანაგრამების ძიებისას'
            });
        }
    });
            res.json({
                original: word,
                anagrams: results
            });

        } catch (error) {
            console.error('შეცდომა ანაგრამების ძიებისას:', error);
            res.status(500).json({
                error: 'შეცდომა ანაგრამების ძიებისას'
            });
        }
    });

// მთავარი გვერდის ენდპოინტი
app.get('/', (req, res) => {
    res.send(`
        <html>
            <head>
                <title>ანაგრამების სერვისი</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
                    h1 { color: #333; }
                    .status { padding: 20px; background: #f4f4f4; border-radius: 5px; }
                    .loaded { color: green; }
                    .loading { color: orange; }
                    code { background: #f0f0f0; padding: 2px 5px; border-radius: 3px; }
                </style>
            </head>
            <body>
                <h1>ანაგრამების სერვისი</h1>
                <div class="status">
                    <p>სტატუსი: <strong>${wordListLoaded ? '<span class="loaded">მზადაა</span>' : '<span class="loading">იტვირთება...</span>'}</strong></p>
                    <p>სიტყვების რაოდენობა: <strong>${wordList.size}</strong></p>
                </div>
                <h2>API დოკუმენტაცია</h2>
                <ul>
                    <li>GET <code>/api/status</code> - სერვისის სტატუსის შემოწმება</li>
                    <li>POST <code>/api/find-anagrams</code> - ანაგრამების ძიება (JSON: {"word": "სიტყვა"})</li>
                    <li>GET <code>/api/find-anagrams?word=სიტყვა</code> - ანაგრამების ძიება GET მეთოდით</li>
                </ul>
                <h2>ტესტი</h2>
                <p>მაგალითი: <a href="/api/find-anagrams?word=სახლი" target="_blank">იპოვე "სახლი"-ს ანაგრამები</a></p>
            </body>
        </html>
    `);
});

// სერვერის გაშვება
app.listen(PORT, () => {
    console.log(`სერვერი გაშვებულია პორტზე ${PORT}`);
});
