/**
 * Типы БД. Пишутся руками — проект маленький, а `supabase gen types` требует
 * установленного CLI и залогиненного проекта у каждого разработчика.
 * Держать в синхроне с supabase/migrations/.
 *
 * Форма должна точно повторять то, что генерирует Supabase (включая
 * `__InternalSupabase` и `Relationships`) — иначе postgrest-js выводит `never`
 * на результатах select.
 */

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export type LessonStatus = 'generating' | 'ready' | 'failed';
export type SessionStatus = 'waiting' | 'active' | 'paused' | 'ended';

export interface Database {
  __InternalSupabase: {
    PostgrestVersion: '13';
  };
  public: {
    Tables: {
      teachers: {
        Row: {
          id: string;
          email: string;
          name: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          name?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          name?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      lessons: {
        Row: {
          id: string;
          teacher_id: string;
          title: string;
          grade: string;
          topic: string | null;
          theme: string;
          status: LessonStatus;
          content: Json | null;
          source_text: string;
          generate_spares: boolean;
          ai_meta: Json | null;
          error_message: string | null;
          generation_token: string | null;
          generation_started_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          teacher_id: string;
          title: string;
          grade: string;
          topic?: string | null;
          theme?: string;
          status?: LessonStatus;
          content?: Json | null;
          source_text?: string;
          generate_spares?: boolean;
          ai_meta?: Json | null;
          error_message?: string | null;
          generation_token?: string | null;
          generation_started_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          teacher_id?: string;
          title?: string;
          grade?: string;
          topic?: string | null;
          theme?: string;
          status?: LessonStatus;
          content?: Json | null;
          source_text?: string;
          generate_spares?: boolean;
          ai_meta?: Json | null;
          error_message?: string | null;
          generation_token?: string | null;
          generation_started_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      sessions: {
        Row: {
          id: string;
          lesson_id: string;
          token: string;
          content_snapshot: Json;
          state: Json;
          status: SessionStatus;
          student_name: string | null;
          started_at: string | null;
          ended_at: string | null;
          expires_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          lesson_id: string;
          token: string;
          content_snapshot: Json;
          state?: Json;
          status?: SessionStatus;
          student_name?: string | null;
          started_at?: string | null;
          ended_at?: string | null;
          expires_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          lesson_id?: string;
          token?: string;
          content_snapshot?: Json;
          state?: Json;
          status?: SessionStatus;
          student_name?: string | null;
          started_at?: string | null;
          ended_at?: string | null;
          expires_at?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      attempts: {
        Row: {
          id: string;
          session_id: string;
          block_id: string;
          answer: Json;
          is_correct: boolean;
          score: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          block_id: string;
          answer: Json;
          is_correct: boolean;
          score?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          block_id?: string;
          answer?: Json;
          is_correct?: boolean;
          score?: number;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: {
      lesson_status: LessonStatus;
      session_status: SessionStatus;
    };
    CompositeTypes: { [_ in never]: never };
  };
}

type PublicTables = Database['public']['Tables'];

export type TeacherRow = PublicTables['teachers']['Row'];
export type LessonRow = PublicTables['lessons']['Row'];
export type SessionRow = PublicTables['sessions']['Row'];
export type AttemptRow = PublicTables['attempts']['Row'];
