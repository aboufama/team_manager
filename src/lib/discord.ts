type DiscordEmbed = {
    title?: string
    description?: string
    color?: number
    fields?: { name: string; value: string; inline?: boolean }[]
    footer?: { text: string }
    timestamp?: string
}

export async function sendDiscordNotification(content: string, embeds?: DiscordEmbed[], webhookUrl?: string | null) {
    if (!webhookUrl) {
        console.warn('No Discord webhook URL provided, skipping notification.')
        return false
    }

    try {
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                content,
                embeds,
            }),
        })

        if (!response.ok) {
            console.error('Failed to send Discord notification:', await response.text())
            return false
        }

        return true
    } catch (error) {
        console.error('Discord webhook error:', error)
        return false
    }
}

// Helper functions for common notifications
export async function notifyTaskCreated(taskTitle: string, projectName: string, assigneeName?: string, assigneeDiscordId?: string | null, webhookUrl?: string | null) {
    const content = assigneeDiscordId ? `<@${assigneeDiscordId}>` : ''
    return sendDiscordNotification(content, [{
        title: '📋 New Task Created',
        description: `**${taskTitle}**`,
        color: 0x5865F2, // Discord blue
        fields: [
            { name: 'Project', value: projectName, inline: true },
            { name: 'Assignee', value: assigneeName || 'Unassigned', inline: true },
        ],
        timestamp: new Date().toISOString(),
    }], webhookUrl)
}

export async function notifyTaskCompleted(taskTitle: string, projectName: string, completedBy: string, completedByDiscordId?: string | null, webhookUrl?: string | null) {
    // Only ping if we want (maybe not for completion? User said "all events... ping the right person")
    const content = completedByDiscordId ? `<@${completedByDiscordId}>` : ''
    return sendDiscordNotification(content, [{
        title: '✅ Task Completed',
        description: `**${taskTitle}**`,
        color: 0x57F287, // Green
        fields: [
            { name: 'Project', value: projectName, inline: true },
            { name: 'Completed by', value: completedBy, inline: true },
        ],
        timestamp: new Date().toISOString(),
    }], webhookUrl)
}

export async function notifyTaskSubmittedForReview(taskTitle: string, projectName: string, submittedBy: string, submittedByDiscordId?: string | null, webhookUrl?: string | null) {
    const content = submittedByDiscordId ? `<@${submittedByDiscordId}>` : ''
    return sendDiscordNotification(content, [{
        title: '🔍 Task Submitted for Review',
        description: `**${taskTitle}**`,
        color: 0xFEE75C, // Yellow
        fields: [
            { name: 'Project', value: projectName, inline: true },
            { name: 'Submitted by', value: submittedBy, inline: true },
        ],
        timestamp: new Date().toISOString(),
    }], webhookUrl)
}

export async function notifyProjectCreated(projectName: string, leadName?: string, webhookUrl?: string | null) {
    return sendDiscordNotification('', [{
        title: '🚀 New Project Created',
        description: `**${projectName}**`,
        color: 0x5865F2,
        fields: leadName ? [
            { name: 'Lead', value: leadName, inline: true },
        ] : [],
        timestamp: new Date().toISOString(),
    }], webhookUrl)
}

export async function notifyUserJoined(userName: string, webhookUrl?: string | null) {
    return sendDiscordNotification('', [{
        title: '👋 New Team Member',
        description: `**${userName}** has joined the workspace!`,
        color: 0x5865F2,
        timestamp: new Date().toISOString(),
    }], webhookUrl)
}

export async function notifyTaskUpdated(taskTitle: string, projectName: string, updatedBy: string, changes: Array<{ field: string; oldValue: string; newValue: string }>, webhookUrl?: string | null) {
    const fields = changes.map(change => ({
        name: change.field,
        value: `**Before:** ${change.oldValue || 'None'}\n**After:** ${change.newValue || 'None'}`,
        inline: false
    }))

    return sendDiscordNotification('', [{
        title: '📝 Task Updated',
        description: `**${taskTitle}**`,
        color: 0x5865F2,
        fields: [
            { name: 'Project', value: projectName, inline: true },
            { name: 'Updated by', value: updatedBy, inline: true },
            ...fields
        ],
        timestamp: new Date().toISOString(),
    }], webhookUrl)
}

export async function notifyTaskOverdue(taskTitle: string, projectName: string, daysOverdue: number, assigneeName?: string, webhookUrl?: string | null) {
    return sendDiscordNotification('', [{
        title: '⚠️ Task Overdue',
        description: `**${taskTitle}**`,
        color: 0xED4245, // Red
        fields: [
            { name: 'Project', value: projectName, inline: true },
            { name: 'Days Overdue', value: `${daysOverdue} day${daysOverdue !== 1 ? 's' : ''}`, inline: true },
            { name: 'Assignee', value: assigneeName || 'Unassigned', inline: true },
        ],
        timestamp: new Date().toISOString(),
    }], webhookUrl)
}
