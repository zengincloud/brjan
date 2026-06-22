"use client"

import { useState, useEffect } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { useUserRole } from "@/hooks/use-user-role"

const demoUpcomingProspects = [
  { id: "1", name: "Eva Green", company: "Green Co", date: "2023-06-20", time: "10:00 AM" },
  { id: "2", name: "Frank White", company: "White Industries", date: "2023-06-21", time: "2:00 PM" },
  { id: "3", name: "Grace Lee", company: "Lee Enterprises", date: "2023-06-22", time: "11:30 AM" },
  { id: "4", name: "Henry Ford", company: "Ford Motors", date: "2023-06-23", time: "3:00 PM" },
  { id: "5", name: "Ivy Chen", company: "Chen Tech", date: "2023-06-24", time: "9:00 AM" },
]

interface UpcomingProspect {
  id: string
  name: string
  company: string
  date: string
  time: string
}

export function UpcomingProspects() {
  const { isSuperAdmin, isLoading: roleLoading } = useUserRole()
  const [searchTerm, setSearchTerm] = useState("")
  const [realProspects, setRealProspects] = useState<UpcomingProspect[]>([])
  const [dataLoading, setDataLoading] = useState(false)

  useEffect(() => {
    if (roleLoading) return
    if (isSuperAdmin) return
    setDataLoading(true)
    fetch("/api/prospects?status=meeting_scheduled")
      .then((r) => (r.ok ? r.json() : { prospects: [] }))
      .then((data) => {
        const prospects = (data.prospects ?? []).map((p: any) => ({
          id: p.id,
          name: p.name || "Unknown",
          company: p.company || "--",
          date: p.lastActivity ? new Date(p.lastActivity).toLocaleDateString() : "--",
          time: p.lastActivity ? new Date(p.lastActivity).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "--",
        }))
        setRealProspects(prospects)
      })
      .catch(console.error)
      .finally(() => setDataLoading(false))
  }, [isSuperAdmin, roleLoading])

  const isLoading = roleLoading || dataLoading
  const upcomingProspects = isSuperAdmin ? demoUpcomingProspects : realProspects

  const filteredProspects = upcomingProspects.filter(
    (prospect) =>
      prospect.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prospect.company.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  return (
    <div className="space-y-4">
      <Input
        type="text"
        placeholder="Search prospects..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="max-w-sm"
      />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Company</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Time</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            [0, 1, 2].map((i) => (
              <TableRow key={i}>
                {[0, 1, 2, 3].map((j) => (
                  <TableCell key={j}><div className="h-4 rounded bg-secondary/60 animate-pulse" /></TableCell>
                ))}
              </TableRow>
            ))
          ) : filteredProspects.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                No upcoming meetings yet.
              </TableCell>
            </TableRow>
          ) : (
            filteredProspects.map((prospect) => (
              <TableRow key={prospect.id}>
                <TableCell>{prospect.name}</TableCell>
                <TableCell>{prospect.company}</TableCell>
                <TableCell>{prospect.date}</TableCell>
                <TableCell>{prospect.time}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
