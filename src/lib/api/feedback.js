import { supabase } from '../supabaseClient.js';

/** The signed-in customer's feedback rows, keyed by appointment_id for easy lookup. */
export async function listMyFeedback() {
  if (!supabase) return {};
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return {};
  const { data, error } = await supabase
    .from('appointment_feedback')
    .select('*')
    .eq('customer_id', auth.user.id);
  if (error) throw error;
  return Object.fromEntries((data ?? []).map(f => [f.appointment_id, f]));
}

/** Rate a completed appointment. RLS only allows this for the appointment's own customer. */
export async function submitFeedback({ appointmentId, rating, comment }) {
  if (!supabase) throw new Error('Supabase غير مهيأ');
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) throw new Error('لا توجد جلسة نشطة');
  const { data, error } = await supabase
    .from('appointment_feedback')
    .upsert({ appointment_id: appointmentId, customer_id: auth.user.id, rating, comment: comment || null }, { onConflict: 'appointment_id' })
    .select()
    .single();
  if (error) throw error;
  return data;
}
