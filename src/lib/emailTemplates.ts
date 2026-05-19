export const taskDoneEmail = (params: {
  recipientName: string
  taskTitle: string
  completedBy: string
  workspaceName: string
}) => ({
  subject: `✓ To-do completed: "${params.taskTitle}"`,
  html: `
    <div style="font-family: -apple-system, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px;">
      <div style="background: #D4500A; width: 36px; height: 36px; border-radius: 8px;
                  display: flex; align-items: center; justify-content: center; margin-bottom: 24px;">
        <span style="color: white; font-size: 18px; font-weight: 700;">G</span>
      </div>

      <h2 style="font-size: 22px; font-weight: 700; color: #1C1917; margin: 0 0 8px;">
        To-do completed ✓
      </h2>

      <p style="color: #78716C; font-size: 15px; margin: 0 0 24px;">
        Hi ${params.recipientName},
      </p>

      <div style="background: #F6F4F0; border-radius: 12px; padding: 20px; margin-bottom: 24px;
                  border-left: 4px solid #16A34A;">
        <p style="margin: 0; font-size: 15px; font-weight: 600; color: #1C1917;">
          "${params.taskTitle}"
        </p>
        <p style="margin: 8px 0 0; font-size: 13px; color: #78716C;">
          Completed by ${params.completedBy} · ${params.workspaceName}
        </p>
      </div>

      <p style="color: #78716C; font-size: 13px; margin: 0;">
        You received this because you were set to be notified when this to-do is completed.
      </p>

      <hr style="border: none; border-top: 1px solid #E7E5E0; margin: 24px 0;" />
      <p style="color: #A8A29E; font-size: 12px; margin: 0;">GradFlow · Graduation Project Management</p>
    </div>
  `,
})

export const taskAssignedEmail = (params: {
  recipientName: string
  taskTitle: string
  assignedBy: string
  dueDate: string | null
  workspaceName: string
}) => ({
  subject: `📋 New to-do assigned: "${params.taskTitle}"`,
  html: `
    <div style="font-family: -apple-system, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px;">
      <div style="background: #D4500A; width: 36px; height: 36px; border-radius: 8px; margin-bottom: 24px;"></div>

      <h2 style="font-size: 22px; font-weight: 700; color: #1C1917; margin: 0 0 8px;">
        New to-do assigned to you
      </h2>

      <p style="color: #78716C; font-size: 15px; margin: 0 0 24px;">
        Hi ${params.recipientName},
      </p>

      <div style="background: #F6F4F0; border-radius: 12px; padding: 20px; margin-bottom: 24px;
                  border-left: 4px solid #2563EB;">
        <p style="margin: 0; font-size: 15px; font-weight: 600; color: #1C1917;">
          "${params.taskTitle}"
        </p>
        <p style="margin: 8px 0 0; font-size: 13px; color: #78716C;">
          Assigned by ${params.assignedBy} · ${params.workspaceName}
          ${params.dueDate ? `<br/>Due: ${params.dueDate}` : ''}
        </p>
      </div>

      <hr style="border: none; border-top: 1px solid #E7E5E0; margin: 24px 0;" />
      <p style="color: #A8A29E; font-size: 12px; margin: 0;">GradFlow · Graduation Project Management</p>
    </div>
  `,
})

export const mentionEmail = (params: {
  recipientName: string
  mentionedBy: string
  messagePreview: string
  workspaceName: string
}) => ({
  subject: `💬 ${params.mentionedBy} mentioned you in ${params.workspaceName}`,
  html: `
    <div style="font-family: -apple-system, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px;">
      <div style="background: #D4500A; width: 36px; height: 36px; border-radius: 8px; margin-bottom: 24px;"></div>

      <h2 style="font-size: 22px; font-weight: 700; color: #1C1917; margin: 0 0 8px;">
        You were mentioned
      </h2>

      <p style="color: #78716C; font-size: 15px; margin: 0 0 24px;">
        Hi ${params.recipientName}, ${params.mentionedBy} mentioned you:
      </p>

      <div style="background: #F6F4F0; border-radius: 12px; padding: 20px; margin-bottom: 24px;
                  border-left: 4px solid #D4500A; font-style: italic;">
        <p style="margin: 0; font-size: 14px; color: #1C1917;">
          "${params.messagePreview}"
        </p>
      </div>

      <hr style="border: none; border-top: 1px solid #E7E5E0; margin: 24px 0;" />
      <p style="color: #A8A29E; font-size: 12px; margin: 0;">GradFlow · Graduation Project Management</p>
    </div>
  `,
})

export const meetingEmail = (params: {
  recipientName: string
  meetingTitle: string
  meetingDate: string
  organizer: string
  workspaceName: string
}) => ({
  subject: `📅 New meeting: "${params.meetingTitle}"`,
  html: `
    <div style="font-family: -apple-system, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px;">
      <div style="background: #D4500A; width: 36px; height: 36px; border-radius: 8px; margin-bottom: 24px;"></div>

      <h2 style="font-size: 22px; font-weight: 700; color: #1C1917; margin: 0 0 8px;">
        New meeting scheduled
      </h2>

      <p style="color: #78716C; font-size: 15px; margin: 0 0 24px;">
        Hi ${params.recipientName},
      </p>

      <div style="background: #F6F4F0; border-radius: 12px; padding: 20px; margin-bottom: 24px;
                  border-left: 4px solid #7C3AED;">
        <p style="margin: 0; font-size: 15px; font-weight: 600; color: #1C1917;">
          ${params.meetingTitle}
        </p>
        <p style="margin: 8px 0 0; font-size: 13px; color: #78716C;">
          📅 ${params.meetingDate}<br/>
          Organized by ${params.organizer} · ${params.workspaceName}
        </p>
      </div>

      <hr style="border: none; border-top: 1px solid #E7E5E0; margin: 24px 0;" />
      <p style="color: #A8A29E; font-size: 12px; margin: 0;">GradFlow · Graduation Project Management</p>
    </div>
  `,
})
