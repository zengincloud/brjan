"use client"

import { useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"

const upcomingProspects = [
  { id: 1, name: "Eva Green", company: "Green Co", date: "2023-06-20", time: "10:00 AM" },
  { id: 2, name: "Frank White", company: "White Industries", date: "2023-06-21", time: "2:00 PM" },
  { id: 3, name: "Grace Lee", company: "Lee Enterprises", date: "2023-06-22", time: "11:30 AM" },
  { id: 4, name: "Henry Ford", company: "Ford Motors", date: "2023-06-23", time: "3:00 PM" },
  { id: 5, name: "Ivy Chen", company: "Chen Tech", date: "2023-06-24", time: "9:00 AM" },
]

export function UpcomingProspects() {
  const [searchTerm, setSearchTerm] = useState("")

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
          {filteredProspects.map((prospect) => (
            <TableRow key={prospect.id}>
              <TableCell>{prospect.name}</TableCell>
              <TableCell>{prospect.company}</TableCell>
              <TableCell>{prospect.date}</TableCell>
              <TableCell>{prospect.time}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
