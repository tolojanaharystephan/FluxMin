-- Migration: Update old role values to new ones
-- Run this: psql -U fluxmin -d fluxmin -f migrate-roles.sql

UPDATE utilisateurs SET role = 'agent_courrier' WHERE role = 'courrier_admin';
UPDATE utilisateurs SET role = 'responsable' WHERE role = 'agent';

-- Verify
SELECT id, email, role FROM utilisateurs ORDER BY id;
