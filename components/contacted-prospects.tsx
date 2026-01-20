"use client"

import { useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"

const contactedProspects = [
  { id: 1, name: "John Doe", company: "ABC Corp", date: "2023-06-15", status: "Interested" },
  { id: 2, name: "Jane Smith", company: "XYZ Inc", date: "2023-06-14", status: "Follow-up" },
  { id: 3, name: "Bob Johnson", company: "123 LLC", date: "2023-06-13", status: "Not Interested" },
  { id: 4, name: "Alice Brown", company: "Tech Co", date: "2023-06-12", status: "Interested" },
  { id: 5, name: "Charlie Davis", company: "Big Corp", date: "2023-06-11", status: "Follow-up" },
]

export function ContactedProspects() {
  const [searchTerm, setSearchTerm] = useState("")

  const filteredProspects = contactedProspects.filter(
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
            <TableHead>Date Contacted</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredProspects.map((prospect) => (
            <TableRow key={prospect.id}>
              <TableCell>{prospect.name}</TableCell>
              <TableCell>{prospect.company}</TableCell>
              <TableCell>{prospect.date}</TableCell>
              <TableCell>{prospect.status}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
