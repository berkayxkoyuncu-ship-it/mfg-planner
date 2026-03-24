-- Migration 001: end_date sütununu generated'dan regular column'a çevir
-- Bu sayede uygulama hafta sonlarını atlayarak end_date'i hesaplayabilir.
-- Supabase SQL Editor'da çalıştır.

ALTER TABLE orders ALTER COLUMN end_date DROP EXPRESSION;
