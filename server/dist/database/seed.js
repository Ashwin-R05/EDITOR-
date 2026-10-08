"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bcrypt_1 = __importDefault(require("bcrypt"));
const db_1 = require("../models/db");
async function seed() {
    console.log('🌱 Seeding database...');
    const connected = await (0, db_1.testConnection)();
    if (!connected) {
        console.error('Cannot seed without database connection.');
        process.exit(1);
    }
    try {
        // 1. Create admin user
        const adminPasswordHash = await bcrypt_1.default.hash('admin123', 12);
        const adminResult = await (0, db_1.query)(`INSERT INTO users (email, password_hash, role, display_name)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO UPDATE SET password_hash = $2
       RETURNING id`, ['admin@techauction.com', adminPasswordHash, 'ADMIN', 'Admin']);
        const adminId = adminResult.rows[0].id;
        console.log('✓ Admin user created:', adminId);
        // 2. Create sample participants
        const participantPassword = await bcrypt_1.default.hash('pass123', 12);
        const participants = [
            { email: 'ashwin@techauction.com', name: 'Ashwin', pid: 'P001', college: 'MIT', dept: 'CSE', year: 3 },
            { email: 'priya@techauction.com', name: 'Priya', pid: 'P002', college: 'MIT', dept: 'IT', year: 2 },
            { email: 'rahul@techauction.com', name: 'Rahul', pid: 'P003', college: 'MIT', dept: 'CSE', year: 3 },
            { email: 'maya@techauction.com', name: 'Maya', pid: 'P004', college: 'MIT', dept: 'ECE', year: 4 },
            { email: 'arjun@techauction.com', name: 'Arjun', pid: 'P005', college: 'MIT', dept: 'CSE', year: 2 },
        ];
        for (const p of participants) {
            const userResult = await (0, db_1.query)(`INSERT INTO users (email, password_hash, role, display_name)
         VALUES ($1, $2, 'PARTICIPANT', $3)
         ON CONFLICT (email) DO UPDATE SET password_hash = $2
         RETURNING id`, [p.email, participantPassword, p.name]);
            await (0, db_1.query)(`INSERT INTO participants (user_id, participant_id, college, department, year)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (participant_id) DO NOTHING`, [userResult.rows[0].id, p.pid, p.college, p.dept, p.year]);
            console.log(`✓ Participant ${p.name} (${p.pid}) created`);
        }
        // 3. Create rounds
        const round1Result = await (0, db_1.query)(`INSERT INTO rounds (round_number, name, description, duration_minutes, run_limit)
       VALUES (1, 'Palindrome', 'C Programming - Palindrome Check', 45, 5)
       ON CONFLICT (round_number) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`, []);
        const round1Id = round1Result.rows[0].id;
        const round2Result = await (0, db_1.query)(`INSERT INTO rounds (round_number, name, description, duration_minutes, run_limit)
       VALUES (2, 'Pattern', 'C Programming - Pattern Printing', 45, 5)
       ON CONFLICT (round_number) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`, []);
        const round2Id = round2Result.rows[0].id;
        console.log('✓ Rounds created');
        // 4. Create problems
        const problem1Result = await (0, db_1.query)(`INSERT INTO problems (round_id, title, statement, input_format, output_format, constraints, examples)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (round_id) DO UPDATE SET title = EXCLUDED.title, statement = EXCLUDED.statement,
         input_format = EXCLUDED.input_format, output_format = EXCLUDED.output_format,
         constraints = EXCLUDED.constraints, examples = EXCLUDED.examples
       RETURNING id`, [
            round1Id,
            'Palindrome Check',
            'Write a C program that reads a string and determines whether it is a palindrome.\n\nA palindrome is a string that reads the same forward and backward (case-insensitive, ignoring non-alphanumeric characters).\n\nYour program should read the input string from stdin and output \"YES\" if it is a palindrome, or \"NO\" if it is not.',
            'A single line containing a string S (1 ≤ |S| ≤ 1000).',
            'Print \"YES\" if the string is a palindrome, \"NO\" otherwise.',
            '1 ≤ |S| ≤ 1000\nThe string may contain uppercase and lowercase letters, digits, spaces, and punctuation.\nComparison is case-insensitive.\nIgnore non-alphanumeric characters when checking.',
            JSON.stringify([
                { input: 'racecar', output: 'YES', explanation: '"racecar" reads the same forwards and backwards.' },
                { input: 'hello', output: 'NO', explanation: '"hello" reversed is "olleh", which is different.' },
                { input: 'A man a plan a canal Panama', output: 'YES', explanation: 'Ignoring spaces and case: "amanaplanacanalpanama" is a palindrome.' }
            ])
        ]);
        const problem1Id = problem1Result.rows[0].id;
        const problem2Result = await (0, db_1.query)(`INSERT INTO problems (round_id, title, statement, input_format, output_format, constraints, examples)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (round_id) DO UPDATE SET title = EXCLUDED.title, statement = EXCLUDED.statement,
         input_format = EXCLUDED.input_format, output_format = EXCLUDED.output_format,
         constraints = EXCLUDED.constraints, examples = EXCLUDED.examples
       RETURNING id`, [
            round2Id,
            'Right Triangle Star Pattern',
            'Write a C program to print a right-angled triangle star pattern.\n\nGiven an integer N, print a right-angled triangle pattern of stars (*) with N rows. The i-th row (1-indexed) should contain exactly i stars.',
            'A single integer N (1 ≤ N ≤ 20)',
            'Print the right-angled triangle pattern with N rows, where the i-th row has i stars separated by spaces.',
            '1 ≤ N ≤ 20',
            JSON.stringify([
                { input: '5', output: '*\n* *\n* * *\n* * * *\n* * * * *', explanation: 'A right triangle with 5 rows.' },
                { input: '3', output: '*\n* *\n* * *', explanation: 'A right triangle with 3 rows.' }
            ])
        ]);
        const problem2Id = problem2Result.rows[0].id;
        console.log('✓ Problems created');
        // 5. Create test cases for Problem 1 (Palindrome)
        const testCases1 = [
            { num: 1, input: 'racecar', output: 'YES', type: 'PUBLIC' },
            { num: 2, input: 'hello', output: 'NO', type: 'PUBLIC' },
            { num: 3, input: 'A man a plan a canal Panama', output: 'YES', type: 'PUBLIC' },
            { num: 4, input: 'madam', output: 'YES', type: 'HIDDEN' },
            { num: 5, input: 'Was it a car or a cat I saw', output: 'YES', type: 'HIDDEN' },
            { num: 6, input: 'programming', output: 'NO', type: 'HIDDEN' },
        ];
        for (const tc of testCases1) {
            await (0, db_1.query)(`INSERT INTO test_cases (problem_id, test_number, input, expected_output, case_type, points)
         VALUES ($1, $2, $3, $4, $5::test_case_type, $6)
         ON CONFLICT (problem_id, test_number) DO NOTHING`, [problem1Id, tc.num, tc.input, tc.output, tc.type, tc.type === 'PUBLIC' ? 10 : 20]);
        }
        // 6. Create test cases for Problem 2 (Pattern)
        const testCases2 = [
            { num: 1, input: '5', output: '*\n* *\n* * *\n* * * *\n* * * * *', type: 'PUBLIC' },
            { num: 2, input: '3', output: '*\n* *\n* * *', type: 'PUBLIC' },
            { num: 3, input: '1', output: '*', type: 'PUBLIC' },
            { num: 4, input: '7', output: '*\n* *\n* * *\n* * * *\n* * * * *\n* * * * * *\n* * * * * * *', type: 'HIDDEN' },
            { num: 5, input: '10', output: '*\n* *\n* * *\n* * * *\n* * * * *\n* * * * * *\n* * * * * * *\n* * * * * * * *\n* * * * * * * * *\n* * * * * * * * * *', type: 'HIDDEN' },
            { num: 6, input: '2', output: '*\n* *', type: 'HIDDEN' },
        ];
        for (const tc of testCases2) {
            await (0, db_1.query)(`INSERT INTO test_cases (problem_id, test_number, input, expected_output, case_type, points)
         VALUES ($1, $2, $3, $4, $5::test_case_type, $6)
         ON CONFLICT (problem_id, test_number) DO NOTHING`, [problem2Id, tc.num, tc.input, tc.output, tc.type, tc.type === 'PUBLIC' ? 10 : 20]);
        }
        console.log('✓ Test cases created');
        // 7. Initialize leaderboard for all participants
        const allParticipants = await (0, db_1.query)('SELECT id FROM participants');
        for (const p of allParticipants.rows) {
            await (0, db_1.query)(`INSERT INTO leaderboard (participant_id) VALUES ($1) ON CONFLICT (participant_id) DO NOTHING`, [p.id]);
        }
        console.log('✓ Leaderboard initialized');
        console.log('\n✅ Seeding completed successfully');
        console.log('\n📋 Login Credentials:');
        console.log('   Admin:       admin@techauction.com / admin123');
        console.log('   Participant:  ashwin@techauction.com / pass123');
        console.log('   Participant:  priya@techauction.com / pass123');
    }
    catch (error) {
        console.error('✗ Seeding failed:', error);
        process.exit(1);
    }
    process.exit(0);
}
seed();
//# sourceMappingURL=seed.js.map