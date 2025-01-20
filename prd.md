Updated PRD: AutoCRM
Project Overview
Build a simplified customer service platform for managing customer inquiries and support tickets. The platform will include a ticketing system, knowledge base, and a basic user role system. The stack prioritizes Next.js for the frontend and Supabase for backend functionality.

1. Core Features for MVP
Frontend (Next.js):
Customer Dashboard:

Form for ticket submission (e.g., subject, description, category).
View list of submitted tickets with statuses (New, In Progress, Resolved).
Search for knowledge base articles.
Agent Dashboard:

View assigned and unassigned tickets.
Update ticket statuses.
Add internal notes to tickets.
Knowledge Base:

Display articles with categories and search functionality.
Admin Dashboard:

Manage agents and ticket assignment rules.
Basic analytics (e.g., tickets created per day, resolution time).
Backend (Supabase):
Database:

Supabase's PostgreSQL database will store:
Users: Customer, Agent, and Admin roles.
Tickets: Subject, description, status, priority, timestamps, and assigned agent.
Knowledge Base Articles: Title, content, category, and metadata.
Comments/Notes: Internal agent comments on tickets.
Authentication:

Use Supabase Auth for role-based authentication.
OAuth options for signing in (e.g., Google, GitHub).
API (Edge Functions):

Ticket CRUD operations.
Ticket assignment logic (auto-assign based on rules or manual).
Notifications (trigger email updates for ticket changes).
File Storage (Buckets):

Store ticket attachments (e.g., screenshots, documents).
Manage knowledge base images or assets.
Real-Time Features:

Supabase real-time subscriptions for:
Live updates to ticket statuses.
New comments/notes on tickets.
Agent assignments.
2. Technical Details
Frontend (Next.js):
UI Framework: Tailwind CSS or Material-UI for styling.
Routing: Use Next.js dynamic routes for user roles (e.g., /dashboard/customer, /dashboard/agent).
Data Fetching:
Use getServerSideProps or getStaticProps for knowledge base articles.
Leverage Supabase client-side API for real-time ticket updates.
Authentication:
Protect routes using Supabase session handling.
Backend (Supabase):
Database Schema:

Users:

sql
Copy
Edit
id UUID PRIMARY KEY,
email TEXT UNIQUE NOT NULL,
password_hash TEXT, -- Optional if using external OAuth
role ENUM ('customer', 'agent', 'admin'),
created_at TIMESTAMP DEFAULT now()
Tickets:

sql
Copy
Edit
id UUID PRIMARY KEY,
customer_id UUID REFERENCES users(id),
assigned_agent_id UUID REFERENCES users(id),
subject TEXT NOT NULL,
description TEXT NOT NULL,
status ENUM ('new', 'in_progress', 'resolved') DEFAULT 'new',
priority ENUM ('low', 'medium', 'high') DEFAULT 'medium',
created_at TIMESTAMP DEFAULT now(),
updated_at TIMESTAMP DEFAULT now()
Knowledge Base:

sql
Copy
Edit
id UUID PRIMARY KEY,
title TEXT NOT NULL,
content TEXT NOT NULL,
category TEXT,
created_at TIMESTAMP DEFAULT now(),
updated_at TIMESTAMP DEFAULT now()
Comments/Notes:

sql
Copy
Edit
id UUID PRIMARY KEY,
ticket_id UUID REFERENCES tickets(id),
user_id UUID REFERENCES users(id),
content TEXT NOT NULL,
internal BOOLEAN DEFAULT TRUE,
created_at TIMESTAMP DEFAULT now()
Edge Functions:

Auto-Assign Tickets:
Function to assign tickets to the least busy agent.
Email Notifications:
Function to send email updates when ticket statuses change.
Validation:
Ensure only agents or admins can modify tickets.
Real-Time Subscriptions:

Listen to ticket updates (e.g., status changes or new comments).
Update dashboards without requiring page refreshes.
File Storage:

Use Supabase Buckets to store:
Ticket attachments with public/private access toggles.
Images for knowledge base articles.
3. Additional Features for Scalability (Post-MVP)
Advanced Ticket Routing:
Add custom rules for ticket assignment (e.g., priority-based, round-robin).
Team Collaboration:
Shared inbox or ticket views for agents working as teams.
Third-Party Integrations:
Slack or email integration for agent notifications.
Advanced Analytics:
Detailed reports on customer satisfaction, agent performance, and resolution times.
Chat Widget:
Add a real-time chat widget for customers.
4. Development Plan
Phase 1: Database and Authentication
Set up Supabase database schema and authentication.
Implement role-based access control.
Phase 2: Ticketing System
Build CRUD APIs for tickets.
Implement basic ticket submission and status updates.
Phase 3: Dashboards
Create customer, agent, and admin dashboards in Next.js.
Add real-time updates via Supabase subscriptions.
Phase 4: Knowledge Base
Set up content management for articles.
Add search functionality.
Phase 5: Notifications and Attachments
Implement file storage for ticket attachments.
Add email notifications via Supabase edge functions.
Stretch Goal: Real-Time Collaboration
Add live typing indicators or shared editing for agents.
