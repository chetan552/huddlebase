import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding database...');

    // Clean existing data
    await prisma.payment.deleteMany();
    await prisma.invoice.deleteMany();
    await prisma.message.deleteMany();
    await prisma.announcement.deleteMany();
    await prisma.attendance.deleteMany();
    await prisma.rSVP.deleteMany();
    await prisma.event.deleteMany();
    await prisma.playerProfile.deleteMany();
    await prisma.familyLink.deleteMany();
    await prisma.teamMember.deleteMany();
    await prisma.team.deleteMany();
    await prisma.club.deleteMany();
    await prisma.user.deleteMany();

    const password = await bcrypt.hash('password123', 12);

    // Create users
    const coach = await prisma.user.create({
        data: { email: 'coach@huddlebase.com', password, name: 'Coach Williams', role: 'COACH', phone: '(555) 100-0001' },
    });
    const admin = await prisma.user.create({
        data: { email: 'admin@huddlebase.com', password, name: 'Alex Admin', role: 'ADMIN', phone: '(555) 100-0002' },
    });
    const players = await Promise.all([
        prisma.user.create({ data: { email: 'sarah@huddlebase.com', password, name: 'Sarah Johnson', role: 'PLAYER', phone: '(555) 200-0001' } }),
        prisma.user.create({ data: { email: 'mike@huddlebase.com', password, name: 'Mike Davis', role: 'PLAYER', phone: '(555) 200-0002' } }),
        prisma.user.create({ data: { email: 'emma@huddlebase.com', password, name: 'Emma Wilson', role: 'PLAYER', phone: '(555) 200-0003' } }),
        prisma.user.create({ data: { email: 'james@huddlebase.com', password, name: 'James Brown', role: 'PLAYER', phone: '(555) 200-0004' } }),
        prisma.user.create({ data: { email: 'olivia@huddlebase.com', password, name: 'Olivia Martinez', role: 'PLAYER', phone: '(555) 200-0005' } }),
        prisma.user.create({ data: { email: 'liam@huddlebase.com', password, name: 'Liam Anderson', role: 'PLAYER', phone: '(555) 200-0006' } }),
    ]);
    const parent = await prisma.user.create({
        data: { email: 'parent@huddlebase.com', password, name: 'Parent Johnson', role: 'PARENT', phone: '(555) 300-0001' },
    });

    // Create club
    const club = await prisma.club.create({
        data: { name: 'Metro Sports Club' },
    });

    // Create teams
    const team1 = await prisma.team.create({
        data: { name: 'Thunder FC', sport: 'Soccer', season: 'Spring 2026', color: '#3b82f6', clubId: club.id },
    });
    const team2 = await prisma.team.create({
        data: { name: 'Lightning Squad', sport: 'Basketball', season: 'Winter 2026', color: '#f59e0b', clubId: club.id },
    });

    // Add members to teams
    await prisma.teamMember.createMany({
        data: [
            { userId: coach.id, teamId: team1.id, role: 'COACH' },
            { userId: coach.id, teamId: team2.id, role: 'COACH' },
            { userId: admin.id, teamId: team1.id, role: 'MANAGER' },
            { userId: players[0].id, teamId: team1.id, role: 'PLAYER', jersey: '7', position: 'Forward' },
            { userId: players[1].id, teamId: team1.id, role: 'PLAYER', jersey: '10', position: 'Midfielder' },
            { userId: players[2].id, teamId: team1.id, role: 'PLAYER', jersey: '1', position: 'Goalkeeper' },
            { userId: players[3].id, teamId: team1.id, role: 'PLAYER', jersey: '4', position: 'Defender' },
            { userId: players[4].id, teamId: team2.id, role: 'PLAYER', jersey: '23', position: 'Point Guard' },
            { userId: players[5].id, teamId: team2.id, role: 'PLAYER', jersey: '11', position: 'Shooting Guard' },
            { userId: parent.id, teamId: team1.id, role: 'PARENT' },
        ],
    });

    // Create family link (parent -> Sarah Johnson)
    await prisma.familyLink.create({
        data: { parentId: parent.id, childId: players[0].id, status: 'ACTIVE' },
    });

    // Create events
    const now = new Date();
    const events = [
        { title: 'Practice Session', type: 'PRACTICE', teamId: team1.id, location: 'City Sports Complex Field 1', startTime: new Date(now.getTime() + 86400000), endTime: new Date(now.getTime() + 86400000 + 5400000) },
        { title: 'vs Phoenix United', type: 'GAME', teamId: team1.id, location: 'Metro Stadium', startTime: new Date(now.getTime() + 86400000 * 3), endTime: new Date(now.getTime() + 86400000 * 3 + 7200000) },
        { title: 'Team Meeting', type: 'MEETING', teamId: team1.id, location: 'Community Center Room B', startTime: new Date(now.getTime() + 86400000 * 5) },
        { title: 'Skills Training', type: 'PRACTICE', teamId: team1.id, location: 'City Sports Complex Field 2', startTime: new Date(now.getTime() + 86400000 * 7), endTime: new Date(now.getTime() + 86400000 * 7 + 5400000) },
        { title: 'Basketball Practice', type: 'PRACTICE', teamId: team2.id, location: 'Metro Gym Court A', startTime: new Date(now.getTime() + 86400000 * 2), endTime: new Date(now.getTime() + 86400000 * 2 + 5400000) },
        { title: 'vs Storm Chasers', type: 'GAME', teamId: team2.id, location: 'Metro Gym Main Court', startTime: new Date(now.getTime() + 86400000 * 6), endTime: new Date(now.getTime() + 86400000 * 6 + 7200000) },
    ];

    for (const e of events) {
        await prisma.event.create({ data: e });
    }

    // Create messages
    const messages = [
        { teamId: team1.id, senderId: coach.id, content: 'Hey team! Don\'t forget about practice tomorrow. Bring your cleats and shin guards.' },
        { teamId: team1.id, senderId: players[0].id, content: 'Got it coach! I\'ll be there early.' },
        { teamId: team1.id, senderId: players[1].id, content: 'Can someone give me a ride? My car is in the shop.' },
        { teamId: team1.id, senderId: players[2].id, content: 'I can pick you up Mike! DM me your address.' },
        { teamId: team1.id, senderId: coach.id, content: 'Great teamwork everyone 💪 See you all tomorrow!' },
    ];

    for (const m of messages) {
        await prisma.message.create({ data: m });
    }

    // Create invoices
    const invoices = [
        { title: 'Season Registration Fee', teamId: team1.id, playerId: players[0].id, amount: 150, dueDate: new Date(now.getTime() + 86400000 * 14), status: 'PAID' },
        { title: 'Season Registration Fee', teamId: team1.id, playerId: players[1].id, amount: 150, dueDate: new Date(now.getTime() + 86400000 * 14), status: 'PENDING' },
        { title: 'Season Registration Fee', teamId: team1.id, playerId: players[2].id, amount: 150, dueDate: new Date(now.getTime() + 86400000 * 14), status: 'PENDING' },
        { title: 'Equipment Fee', teamId: team1.id, playerId: players[3].id, amount: 75, dueDate: new Date(now.getTime() - 86400000 * 3), status: 'OVERDUE' },
        { title: 'Tournament Entry', teamId: team2.id, playerId: players[4].id, amount: 50, dueDate: new Date(now.getTime() + 86400000 * 7), status: 'PENDING' },
    ];

    for (const inv of invoices) {
        await prisma.invoice.create({ data: inv });
    }

    // Create announcements
    const announcements = [
        { teamId: team1.id, authorId: coach.id, title: 'New Season Kickoff!', body: 'Welcome to Spring 2026! Practice starts this week. Make sure your registration fees are paid and you have proper gear ready.', priority: 'HIGH', pinned: true },
        { teamId: team1.id, authorId: coach.id, title: 'Practice Schedule Updated', body: 'We\'ve moved Tuesday practices from 4 PM to 5 PM starting next week due to field availability. Please adjust your calendars.', priority: 'NORMAL' },
        { teamId: team2.id, authorId: coach.id, title: 'Game Day Uniform Reminder', body: 'Everyone must wear the official Lightning Squad jersey for Saturday\'s game against Storm Chasers. Home whites only.', priority: 'NORMAL' },
        { teamId: team1.id, authorId: coach.id, title: 'Equipment Drive', body: 'We\'re collecting gently used cleats and shin guards for our community outreach program. Drop off at Friday practice!', priority: 'LOW' },
    ];

    for (const a of announcements) {
        await prisma.announcement.create({ data: a });
    }

    console.log('✅ Seed complete!');
    console.log('');
    console.log('Demo accounts:');
    console.log('  Coach:  coach@huddlebase.com / password123');
    console.log('  Admin:  admin@huddlebase.com / password123');
    console.log('  Player: sarah@huddlebase.com / password123');
    console.log('  Parent: parent@huddlebase.com / password123');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
