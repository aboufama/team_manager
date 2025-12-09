
const { PrismaClient } = require('@prisma/client')
const fs = require('fs')
const path = require('path')

const prisma = new PrismaClient()

async function backup() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backupDir = path.join(__dirname, 'backups')

    if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir)
    }

    const filename = path.join(backupDir, `backup-${timestamp}.json`)

    try {
        console.log('Starting backup...')

        // Fetch all data
        const users = await prisma.user.findMany()
        const workspaces = await prisma.workspace.findMany()
        const workspaceMembers = await prisma.workspaceMember.findMany()
        const projects = await prisma.project.findMany()
        const pushes = await prisma.push.findMany()
        const boards = await prisma.board.findMany()
        const columns = await prisma.column.findMany()
        const tasks = await prisma.task.findMany()
        const activityLogs = await prisma.activityLog.findMany()
        const comments = await prisma.comment.findMany()
        const notifications = await prisma.notification.findMany()

        const backupData = {
            timestamp: new Date().toISOString(),
            data: {
                users,
                workspaces,
                workspaceMembers,
                projects,
                pushes,
                boards,
                columns,
                tasks,
                activityLogs,
                comments,
                notifications
            }
        }

        fs.writeFileSync(filename, JSON.stringify(backupData, null, 2))
        console.log(`Backup completed successfully: ${filename}`)
        console.log(`Total records:`)
        Object.keys(backupData.data).forEach(key => {
            console.log(`- ${key}: ${backupData.data[key].length}`)
        })

    } catch (error) {
        console.error('Backup failed:', error)
    } finally {
        await prisma.$disconnect()
    }
}

backup()
