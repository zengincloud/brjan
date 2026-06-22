"use client"

import { useState, useEffect, useRef } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Trash2, Check } from "lucide-react"
import { cn } from "@/lib/utils"

type Todo = {
  id: string
  title: string
  completed: boolean
  createdAt: string
}

interface TodoPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function TodoPanel({ open, onOpenChange }: TodoPanelProps) {
  const [todos, setTodos] = useState<Todo[]>([])
  const [loading, setLoading] = useState(false)
  const [newTitle, setNewTitle] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setLoading(true)
      fetch("/api/todos")
        .then((r) => r.json())
        .then((d) => setTodos(d.todos ?? []))
        .finally(() => setLoading(false))
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open])

  const incomplete = todos.filter((t) => !t.completed)
  const completed = todos.filter((t) => t.completed)

  const addTodo = async () => {
    const title = newTitle.trim()
    if (!title) return
    setNewTitle("")
    const optimistic: Todo = { id: `tmp-${Date.now()}`, title, completed: false, createdAt: new Date().toISOString() }
    setTodos((prev) => [optimistic, ...prev])
    const res = await fetch("/api/todos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title }) })
    const data = await res.json()
    setTodos((prev) => prev.map((t) => (t.id === optimistic.id ? data.todo : t)))
  }

  const toggle = async (todo: Todo) => {
    setTodos((prev) => prev.map((t) => (t.id === todo.id ? { ...t, completed: !t.completed } : t)))
    await fetch(`/api/todos/${todo.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: !todo.completed }),
    })
  }

  const remove = async (id: string) => {
    setTodos((prev) => prev.filter((t) => t.id !== id))
    await fetch(`/api/todos/${id}`, { method: "DELETE" })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex flex-col p-0 sm:max-w-xs">
        <SheetHeader className="px-4 pt-5 pb-3 border-b border-border">
          <SheetTitle className="text-sm font-semibold">To Do</SheetTitle>
        </SheetHeader>

        {/* Add input */}
        <div className="px-4 py-3 border-b border-border flex gap-2">
          <Input
            ref={inputRef}
            placeholder="Add a to-do..."
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addTodo()}
            className="h-8 text-sm bg-secondary/50 border-border"
          />
          <Button size="icon" variant="ghost" onClick={addTodo} className="h-8 w-8 shrink-0 hover:bg-accent/10 hover:text-accent">
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="space-y-1 px-4 py-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-8 rounded-md bg-secondary/60 animate-pulse" />
              ))}
            </div>
          ) : (
            <>
              {incomplete.length === 0 && completed.length === 0 && (
                <p className="text-xs text-muted-foreground text-center mt-8 px-4">Nothing to do — you&apos;re all clear</p>
              )}

              {incomplete.map((todo) => (
                <TodoRow key={todo.id} todo={todo} onToggle={toggle} onDelete={remove} />
              ))}

              {completed.length > 0 && (
                <>
                  {incomplete.length > 0 && <div className="h-px bg-border mx-4 my-1" />}
                  {completed.map((todo) => (
                    <TodoRow key={todo.id} todo={todo} onToggle={toggle} onDelete={remove} />
                  ))}
                </>
              )}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

function formatAdded(dateStr: string) {
  const d = new Date(dateStr)
  const dd = String(d.getDate()).padStart(2, "0")
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const hh = String(d.getHours()).padStart(2, "0")
  const min = String(d.getMinutes()).padStart(2, "0")
  return `${dd}/${mm} ${hh}:${min}`
}

function TodoRow({ todo, onToggle, onDelete }: { todo: Todo; onToggle: (t: Todo) => void; onDelete: (id: string) => void }) {
  return (
    <div className="group flex items-start gap-2 px-4 py-2.5 hover:bg-secondary/40 transition-colors">
      <button
        onClick={() => onToggle(todo)}
        className={cn(
          "flex-shrink-0 mt-0.5 w-4 h-4 rounded border flex items-center justify-center transition-colors",
          todo.completed
            ? "bg-accent border-accent text-white"
            : "border-border hover:border-accent/60"
        )}
      >
        {todo.completed && <Check className="h-2.5 w-2.5" strokeWidth={3} />}
      </button>
      <div className="flex-1 min-w-0">
        <span className={cn("text-sm leading-snug block", todo.completed && "line-through text-muted-foreground")}>
          {todo.title}
        </span>
        {!todo.id.startsWith("tmp-") && (
          <span className="text-[10px] text-muted-foreground/60">{formatAdded(todo.createdAt)}</span>
        )}
      </div>
      <button
        onClick={() => onDelete(todo.id)}
        className="opacity-0 group-hover:opacity-100 mt-0.5 text-muted-foreground hover:text-destructive transition-all"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
