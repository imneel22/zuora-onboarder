import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { inferenceId, feedback, userId } = await req.json();

    if (!inferenceId || !feedback) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch the current inference
    const { data: inference, error: fetchError } = await supabase
      .from('prpc_inferences')
      .select('*')
      .eq('id', inferenceId)
      .single();

    if (fetchError || !inference) {
      return new Response(
        JSON.stringify({ error: 'Inference not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update status to processing
    await supabase
      .from('prpc_inferences')
      .update({ status: 'processing' })
      .eq('id', inferenceId);

    // Call Lovable AI for reclassification
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const prompt = `You are a revenue recognition expert. A PRPC (Product-Rate Plan-Charge) has been classified, but the user disagrees.

Current Classification:
- Product: ${inference.product_name}
- Rate Plan: ${inference.rate_plan_name}
- Charge: ${inference.charge_name}
- Current Category: ${inference.inferred_product_category}
- Current POB: ${inference.inferred_pob}

Original Rationale: ${inference.rationale}

User Feedback: ${feedback}

Based on the user's feedback, provide a NEW classification. Consider:
1. Revenue Recognition Timing (upon booking, upon billing, upon event)
2. Amortization Technique (ratable over time, immediate)
3. Product Category
4. Pattern of Business (POB)

Provide a clear rationale explaining why this new classification better aligns with the user's feedback.`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'You are a revenue recognition expert. Provide classifications in a structured format.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'classify_prpc',
            description: 'Classify a PRPC based on user feedback',
            parameters: {
              type: 'object',
              properties: {
                category: { type: 'string', description: 'Product category' },
                pob: { type: 'string', description: 'Pattern of business' },
                revenue_recognition_timing: { 
                  type: 'string', 
                  enum: ['upon booking', 'upon billing', 'upon event'],
                  description: 'When revenue should be recognized'
                },
                amortization_technique: { 
                  type: 'string', 
                  enum: ['ratable over time', 'immediate'],
                  description: 'How to amortize the revenue'
                },
                rationale: { type: 'string', description: 'Explanation for the classification' },
                confidence: { type: 'number', description: 'Confidence score between 0 and 1' }
              },
              required: ['category', 'pob', 'revenue_recognition_timing', 'amortization_technique', 'rationale', 'confidence']
            }
          }
        }],
        tool_choice: { type: 'function', function: { name: 'classify_prpc' } }
      })
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI Gateway error:', aiResponse.status, errorText);
      throw new Error('AI classification failed');
    }

    const aiResult = await aiResponse.json();
    const toolCall = aiResult.choices[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      throw new Error('No classification returned from AI');
    }

    const classification = JSON.parse(toolCall.function.arguments);

    // Update the inference with new classification
    const { error: updateError } = await supabase
      .from('prpc_inferences')
      .update({
        inferred_product_category: classification.category,
        inferred_pob: classification.pob,
        rationale: classification.rationale,
        confidence: classification.confidence,
        status: 'user_adjusted',
        last_reviewed_at: new Date().toISOString(),
        last_reviewed_by: userId
      })
      .eq('id', inferenceId);

    if (updateError) {
      throw updateError;
    }

    // Log the audit trail
    await supabase.from('audit_log').insert({
      actor: userId,
      action: 'ai_reclassify',
      entity_type: 'prpc',
      entity_id: inferenceId,
      customer_id: inference.customer_id,
      before_json: {
        category: inference.inferred_product_category,
        pob: inference.inferred_pob,
        rationale: inference.rationale
      },
      after_json: {
        category: classification.category,
        pob: classification.pob,
        rationale: classification.rationale,
        feedback: feedback
      }
    });

    // Calculate XP earned (gamification)
    const xpEarned = Math.round(classification.confidence * 100);

    return new Response(
      JSON.stringify({
        success: true,
        classification,
        xpEarned,
        message: 'Classification updated successfully!'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Reclassification error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});