"use client"

import { useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ChevronDown, ChevronRight, Globe, Mail, MoreHorizontal, Phone, Users } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

// Dummy data for companies and their priority contacts
const companiesData = [
  {
    id: 1,
    name: "Tech Corp",
    industry: "Technology",
    location: "San Francisco, CA",
    website: "techcorp.com",
    totalContacts: 12,
    contacts: [
      { id: 1, name: "John Doe", title: "CEO", email: "john@techcorp.com" },
      { id: 2, name: "Jane Smith", title: "CTO", email: "jane@techcorp.com" },
      { id: 3, name: "Bob Wilson", title: "Sales Director", email: "bob@techcorp.com" },
    ],
  },
  {
    id: 2,
    name: "Startup Inc",
    industry: "Software",
    location: "New York, NY",
    website: "startupinc.com",
    totalContacts: 8,
    contacts: [
      { id: 4, name: "Alice Brown", title: "Founder", email: "alice@startupinc.com" },
      { id: 5, name: "Charlie Davis", title: "Product Manager", email: "charlie@startupinc.com" },
    ],
  },
  {
    id: 3,
    name: "Global Industries",
    industry: "Manufacturing",
    location: "Chicago, IL",
    website: "globalind.com",
    totalContacts: 15,
    contacts: [
      { id: 6, name: "Eva Green", title: "Operations Director", email: "eva@globalind.com" },
      { id: 7, name: "Frank White", title: "HR Manager", email: "frank@globalind.com" },
      { id: 8, name: "Grace Lee", title: "Marketing Lead", email: "grace@globalind.com" },
    ],
  },
]

export function CompanyList() {
  const [searchTerm, setSearchTerm] = useState("")
  const [expandedCompany, setExpandedCompany] = useState<number | null>(null)
  const [selectedCompany, setSelectedCompany] = useState<(typeof companiesData)[0] | null>(null)
  const [showContactsDialog, setShowContactsDialog] = useState(false)

  const filteredCompanies = companiesData.filter(
    (company) =>
      company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      company.industry.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const handleShowContacts = (company: (typeof companiesData)[0]) => {
    setSelectedCompany(company)
    setShowContactsDialog(true)
  }

  return (
    <div className="space-y-4">
      <Input
        type="text"
        placeholder="Search companies..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="max-w-sm"
      />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[30px]"></TableHead>
            <TableHead>Company</TableHead>
            <TableHead>Industry</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>Website</TableHead>
            <TableHead>Contacts</TableHead>
            <TableHead className="w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredCompanies.map((company) => (
            <>
              <TableRow key={company.id}>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setExpandedCompany(expandedCompany === company.id ? null : company.id)}
                  >
                    {expandedCompany === company.id ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </Button>
                </TableCell>
                <TableCell>
                  <div className="font-medium">{company.name}</div>
                </TableCell>
                <TableCell>{company.industry}</TableCell>
                <TableCell>{company.location}</TableCell>
                <TableCell>
                  <a
                    href={`https://${company.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-blue-600 hover:underline"
                  >
                    <Globe className="h-4 w-4" />
                    {company.website}
                  </a>
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm" onClick={() => handleShowContacts(company)} className="gap-2">
                    <Users className="h-4 w-4" />
                    {company.totalContacts} contacts
                  </Button>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon">
                      <Mail className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon">
                      <Phone className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
              {expandedCompany === company.id && (
                <TableRow>
                  <TableCell colSpan={7}>
                    <div className="py-2 px-4">
                      <h4 className="text-lg font-semibold mb-3">Priority Contacts</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {company.contacts.map((contact) => (
                          <div key={contact.id} className="flex items-center gap-3 p-3 rounded-lg border">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={`/placeholder.svg`} />
                              <AvatarFallback>
                                {contact.name
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <div className="font-medium">{contact.name}</div>
                              <div className="text-sm text-muted-foreground">{contact.title}</div>
                            </div>
                            <div className="flex gap-2">
                              <Button variant="ghost" size="icon">
                                <Mail className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon">
                                <Phone className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </>
          ))}
        </TableBody>
      </Table>

      <Dialog open={showContactsDialog} onOpenChange={setShowContactsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedCompany?.name} - Priority Contacts</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="grid gap-4">
              {selectedCompany?.contacts.map((contact) => (
                <div key={contact.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={`/placeholder.svg`} />
                      <AvatarFallback>
                        {contact.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">{contact.name}</div>
                      <div className="text-sm text-muted-foreground">{contact.title}</div>
                      <div className="text-sm text-muted-foreground">{contact.email}</div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="icon">
                      <Mail className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon">
                      <Phone className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  )
}
