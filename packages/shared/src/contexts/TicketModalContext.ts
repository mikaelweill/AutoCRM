import { createContext, useContext } from 'react'

export const TicketModalContext = createContext<{
  closeModal: () => void
}>({ closeModal: () => {} })

export const useTicketModal = () => useContext(TicketModalContext) 