export const CTA_BY_ROLE: Record<string, { label: string; href: string }> = {
  sdr_bdr:           { label: 'Make your first call',    href: '/dialer' },
  account_executive: { label: 'Add your first prospect', href: '/prospects' },
  sales_manager:     { label: 'Invite your team',        href: '/settings?tab=team' },
  founder_ceo:       { label: 'Make your first call',    href: '/dialer' },
  other:             { label: 'Explore the platform',    href: '/dialer' },
}

export const DEFAULT_CTA = { label: 'Make your first call', href: '/dialer' }
