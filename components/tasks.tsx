"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"

const initialTasks = [
  { id: 1, title: "Follow up with John Doe", completed: false },
  { id: 2, title: "Prepare presentation for XYZ Inc", completed: false },
  { id: 3, title: "Send proposal to 123 LLC", completed: true },
  { id: 4, title: "Schedule meeting with Tech Co", completed: false },
  { id: 5, title: "Research Big Corp's latest products", completed: false },
]

export function Tasks() {
  const [tasks, setTasks] = useState(initialTasks)
  const [newTask, setNewTask] = useState("")

  const addTask = (e: React.FormEvent) => {
    e.preventDefault()
    if (newTask.trim()) {
      setTasks([...tasks, { id: Date.now(), title: newTask, completed: false }])
      setNewTask("")
    }
  }

  const toggleTask = (id: number) => {
    setTasks(tasks.map((task) => (task.id === id ? { ...task, completed: !task.completed } : task)))
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tasks</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={addTask} className="flex space-x-2 mb-4">
          <Input
            type="text"
            placeholder="Add a new task..."
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            className="flex-grow"
          />
          <button type="submit" className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90">
            Add
          </button>
        </form>
        <ul className="space-y-2">
          {tasks.map((task) => (
            <li key={task.id} className="flex items-center space-x-2">
              <Checkbox id={`task-${task.id}`} checked={task.completed} onCheckedChange={() => toggleTask(task.id)} />
              <label
                htmlFor={`task-${task.id}`}
                className={`flex-grow ${task.completed ? "line-through text-gray-500" : ""}`}
              >
                {task.title}
              </label>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
