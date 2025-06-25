import { supabase } from '../lib/supabase';

export const debugSupabaseConnection = async () => {
  try {
    // Check auth status
    const { data: authData, error: authError } = await supabase.auth.getUser();
    console.log('🔐 Auth check:', { authData, authError });

    if (authError || !authData.user) {
      console.error('❌ Not authenticated');
      return false;
    }

    const userId = authData.user.id;
    console.log('✅ Authenticated user:', userId);

    // Test reading job applications
    const { data: apps, error: readError } = await supabase
      .from('job_applications')
      .select('*')
      .eq('user_id', userId)
      .limit(1);
    
    console.log('📖 Read test:', { apps, readError });

    // Test writing a simple job application
    const testApp = {
      user_id: userId,
      company_name: 'Test Company',
      position: 'Test Position',
      status: 'not_applied',
      application_date: new Date().toISOString(),
    };

    const { data: insertData, error: insertError } = await supabase
      .from('job_applications')
      .insert(testApp)
      .select()
      .single();

    console.log('✍️ Insert test:', { insertData, insertError });

    if (insertData && !insertError) {
      // Test updating the job application
      const { data: updateData, error: updateError } = await supabase
        .from('job_applications')
        .update({ notes: 'Test update' })
        .eq('id', insertData.id)
        .select()
        .single();

      console.log('📝 Update test:', { updateData, updateError });

      // Clean up - delete the test record
      const { error: deleteError } = await supabase
        .from('job_applications')
        .delete()
        .eq('id', insertData.id);

      console.log('🗑️ Delete test:', { deleteError });
    }

    return true;
  } catch (error) {
    console.error('💥 Debug error:', error);
    return false;
  }
};

export default debugSupabaseConnection;
