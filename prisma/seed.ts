import { PrismaClient, TaskPriority, TaskStatus, TaskType } from "@prisma/client"

const prisma = new PrismaClient()

const tasks = [
  {
    id: "task-1",
    type: TaskType.hot_lead,
    title: "Follow up with Sarah from TechCorp",
    description: "Showed high interest in our enterprise solution",
    contact: {
      name: "Sarah Johnson",
      title: "CTO",
      company: "TechCorp",
      email: "sarah@techcorp.com",
      phone: "+1 (555) 123-4567",
    },
    company: {
      name: "TechCorp",
      website: "techcorp.com",
    },
    dueDate: new Date("2023-06-15"),
    priority: TaskPriority.high,
    status: TaskStatus.to_do,
    createdAt: new Date("2023-06-10"),
  },
  {
    id: "task-2",
    type: TaskType.interested,
    title: "Send proposal to Michael at GlobalTech",
    description: "Requested pricing information for 50 seats",
    contact: {
      name: "Michael Chen",
      title: "VP of Sales",
      company: "GlobalTech",
      email: "michael@globaltech.com",
      phone: "+1 (555) 987-6543",
    },
    company: {
      name: "GlobalTech",
      website: "globaltech.com",
    },
    dueDate: new Date("2023-06-18"),
    priority: TaskPriority.medium,
    status: TaskStatus.to_do,
    createdAt: new Date("2023-06-11"),
  },
  {
    id: "task-3",
    type: TaskType.website_visit,
    title: "Reach out to InnovateCo",
    description: "Visited pricing page 5 times in the last week",
    company: {
      name: "InnovateCo",
      website: "innovateco.com",
    },
    priority: TaskPriority.medium,
    status: TaskStatus.to_do,
    createdAt: new Date("2023-06-12"),
  },
  {
    id: "task-4",
    type: TaskType.follow_up,
    title: "Quarterly check-in with FutureSoft",
    description: "Regular account maintenance call",
    contact: {
      name: "Emily Davis",
      title: "Customer Success Manager",
      company: "FutureSoft",
      email: "emily@futuresoft.com",
      phone: "+1 (555) 234-5678",
    },
    company: {
      name: "FutureSoft",
      website: "futuresoft.com",
    },
    dueDate: new Date("2023-06-20"),
    priority: TaskPriority.low,
    status: TaskStatus.to_do,
    createdAt: new Date("2023-06-13"),
  },
  {
    id: "task-5",
    type: TaskType.hot_lead,
    title: "Demo for NextGen Solutions",
    description: "CEO requested a personalized demo",
    contact: {
      name: "Robert Taylor",
      title: "CEO",
      company: "NextGen Solutions",
      email: "robert@nextgensolutions.com",
      phone: "+1 (555) 345-6789",
    },
    company: {
      name: "NextGen Solutions",
      website: "nextgensolutions.com",
    },
    dueDate: new Date("2023-06-16"),
    priority: TaskPriority.high,
    status: TaskStatus.in_progress,
    createdAt: new Date("2023-06-09"),
  },
  {
    id: "task-6",
    type: TaskType.website_visit,
    title: "Follow up with DataDrive",
    description: "Downloaded whitepaper on data security",
    company: {
      name: "DataDrive",
      website: "datadrive.com",
    },
    priority: TaskPriority.low,
    status: TaskStatus.in_progress,
    createdAt: new Date("2023-06-14"),
  },
  {
    id: "task-7",
    type: TaskType.interested,
    title: "Schedule demo with CloudNine",
    description: "Interested in our analytics platform",
    contact: {
      name: "Jessica Lee",
      title: "Head of Operations",
      company: "CloudNine",
      email: "jessica@cloudnine.com",
      phone: "+1 (555) 456-7890",
    },
    company: {
      name: "CloudNine",
      website: "cloudnine.com",
    },
    dueDate: new Date("2023-06-19"),
    priority: TaskPriority.medium,
    status: TaskStatus.done,
    createdAt: new Date("2023-06-08"),
  },
  {
    id: "task-8",
    type: TaskType.follow_up,
    title: "Contract renewal with AlphaTech",
    description: "Current contract expires next month",
    contact: {
      name: "David Wilson",
      title: "Procurement Manager",
      company: "AlphaTech",
      email: "david@alphatech.com",
      phone: "+1 (555) 567-8901",
    },
    company: {
      name: "AlphaTech",
      website: "alphatech.com",
    },
    dueDate: new Date("2023-06-25"),
    priority: TaskPriority.high,
    status: TaskStatus.done,
    createdAt: new Date("2023-06-07"),
  },
]

async function main() {
  for (const task of tasks) {
    await prisma.task.upsert({
      where: { id: task.id },
      update: task,
      create: task,
    })
  }
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (error) => {
    console.error(error)
    await prisma.$disconnect()
    process.exit(1)
  })
