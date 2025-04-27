require('dotenv').config(); // Load environment variables from .env file
const express = require('express');
const bodyParser = require('body-parser');
const OpenAI = require('openai'); // Changed the import here
const { Groq } = require('groq-sdk');
const math = require('mathjs');
const cors = require('cors');

const app = express();
const port = 3000;

app.use(bodyParser.json());
app.use(express.static('public')); // Serve your frontend files
app.use(cors({
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
}));

// OpenAI Configuration
const openai = new OpenAI({ // Instantiate OpenAI directly with the apiKey
    apiKey: process.env.OPENAI_API_KEY,
});

// Groq Configuration
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const groqModel = 'llama-3.3-70b-versatile'; // Choose a Groq supported model

app.post('/api/solve', async (req, res) => {
    const { problem } = req.body;
    let solution = '';

    console.log('Backend received problem:', problem);

    try {
        // 1. Try to solve with Math.js (handle both numerical and algebraic)
        try {
            const parsedProblem = math.parse(problem);
            const unknownSymbols = parsedProblem.filter(node => node.isSymbol() && !math.getScope().hasOwnProperty(node.name));
            const hasEquality = problem.includes('=');

            if (unknownSymbols.length > 0 && hasEquality) {
                // It seems to be an algebraic equation
                try {
                    const simplified = math.simplify(problem);
                    solution = math.format(simplified);
                    console.log('Algebraic solution (simplified):', solution);
                } catch (simplifyError) {
                    try {
                        // Try to solve for the unknown symbol (assuming one primary unknown)
                        const leftHandSide = problem.split('=')[0];
                        const rightHandSide = problem.split('=')[1];
                        if (unknownSymbols.length === 1) {
                            const symbol = unknownSymbols[0].name;
                            const solved = math.solve(leftHandSide, symbol);
                            solution = `${symbol} = ${math.format(solved)}`;
                            console.log('Algebraic solution (solved):', solution);
                        } else {
                            throw new Error('Multiple unknowns or complex algebraic equation.');
                        }
                    } catch (solveError) {
                        console.log('Math.js could not solve algebraically:', problem, solveError);
                        throw solveError; // Re-throw to trigger AI if needed
                    }
                }
            } else {
                // It seems to be a numerical expression
                const result = math.evaluate(problem);
                solution = math.format(result);
                console.log('Math.js numerical solution:', solution);
            }
        } catch (mathError) {
            console.log('Math.js could not process:', problem, mathError);
            // 2. If Math.js fails or detects a complex equation, use OpenAI/Groq
            try {
                const completion = await groq.chat.completions.create({
                    model: groqModel,
                    messages: [
                        { role: "system", content: "You are a helpful math tutor. Explain the solution step-by-step for the given math problem." },
                        { role: "user", content: `Solve this math problem and explain your steps: ${problem}` },
                    ],
                });
                solution = completion.choices[0].message.content;
                console.log('Groq API solution:', solution);
            } catch (groqError) {
                console.error('Error using Groq API:', groqError);
                solution = 'Could not solve the problem using AI.';
                console.log('Groq API error:', groqError);
            }
        }
        console.log('Backend sending solution:', solution);
        res.json({ solution });
    } catch (error) {
        console.error('Error processing request:', error);
        res.status(500).json({ error: 'Failed to process the problem.' });
    }
});

app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});