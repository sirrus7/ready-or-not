/*
  # Create classroom sessions schema

  1. New Tables
    - `sessions`
      - `id` (uuid, primary key)
      - `name` (text) - Session/classroom name
      - `teacher_id` (uuid) - References auth.users
      - `current_slide` (integer) - Current slide number
      - `is_playing` (boolean) - Playback state
      - `notes` (text) - Session notes
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `sessions` table
    - Add policies for teachers to manage their sessions
    - Add policies for students to view session data
*/

CREATE TABLE IF NOT EXISTS sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  teacher_id uuid NOT NULL REFERENCES auth.users(id),
  current_slide integer NOT NULL DEFAULT 1,
  is_playing boolean NOT NULL DEFAULT false,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- Teachers can manage their own sessions
CREATE POLICY "Teachers can manage their own sessions"
  ON sessions
  FOR ALL
  TO authenticated
  USING (auth.uid() = teacher_id);

-- Anyone can view active sessions (for student display)
CREATE POLICY "Anyone can view active sessions"
  ON sessions
  FOR SELECT
  TO authenticated
  USING (true);