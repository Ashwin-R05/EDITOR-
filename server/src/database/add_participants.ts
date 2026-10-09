import bcrypt from 'bcrypt';
import { query, testConnection } from '../models/db';

async function add15Participants() {
  console.log('🚀 Adding 15 participants to the database...');

  const connected = await testConnection();
  if (!connected) {
    console.error('Cannot connect to database.');
    process.exit(1);
  }

  const credentials: Array<{
    name: string;
    email: string;
    participantId: string;
    password: string;
  }> = [];

  try {
    for (let i = 1; i <= 15; i++) {
      const num = String(i).padStart(2, '0');
      const name = `user${num}`;
      const email = `user${num}@techauction.com`;
      const participantId = `user${num}`;
      const plainPassword = `user${num}@123`;
      const passwordHash = await bcrypt.hash(plainPassword, 12);

      const deptList = ['CSE', 'IT', 'AI & DS', 'ECE', 'Cybersecurity'];
      const dept = deptList[(i - 1) % deptList.length];
      const year = ((i - 1) % 4) + 1;
      const phone = `+91 98765 432${num}`;

      // 1. Insert or update user
      const userRes = await query(
        `INSERT INTO users (email, password_hash, role, display_name)
         VALUES ($1, $2, 'PARTICIPANT', $3)
         ON CONFLICT (email) DO UPDATE 
           SET password_hash = EXCLUDED.password_hash,
               display_name = EXCLUDED.display_name,
               role = 'PARTICIPANT',
               is_active = true
         RETURNING id`,
        [email, passwordHash, name]
      );
      const userId = userRes.rows[0].id;

      // 2. Insert or update participant
      const partRes = await query(
        `INSERT INTO participants (user_id, participant_id, college, department, year, phone)
         VALUES ($1, $2, 'Tech Institute of Technology', $3, $4, $5)
         ON CONFLICT (participant_id) DO UPDATE 
           SET user_id = EXCLUDED.user_id,
               college = EXCLUDED.college,
               department = EXCLUDED.department,
               year = EXCLUDED.year,
               phone = EXCLUDED.phone
         RETURNING id`,
        [userId, participantId, dept, year, phone]
      );
      const participantTableId = partRes.rows[0].id;

      // 3. Ensure entry in leaderboard
      await query(
        `INSERT INTO leaderboard (participant_id)
         VALUES ($1)
         ON CONFLICT (participant_id) DO NOTHING`,
        [participantTableId]
      );

      credentials.push({
        name,
        email,
        participantId,
        password: plainPassword,
      });

      console.log(`✓ Added ${name} (${email})`);
    }

    console.log('\n======================================================');
    console.log('✅ ALL 15 PARTICIPANTS SUCCESSFULLY ADDED TO DATABASE');
    console.log('======================================================\n');
    console.table(credentials);

    process.exit(0);
  } catch (error) {
    console.error('Failed to add participants:', error);
    process.exit(1);
  }
}

add15Participants();
