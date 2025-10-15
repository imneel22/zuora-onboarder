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
    const { feedback, customerId, selectedCategory } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    console.log('Processing feedback:', feedback, 'for category:', selectedCategory);

    // Get current PRPCs in this category
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: prpcs } = await supabase
      .from('prpc_inferences')
      .select('*')
      .eq('customer_id', customerId)
      .eq('inferred_product_category', selectedCategory)
      .limit(20);

    const prpcList = prpcs?.map(p => `${p.product_name} - ${p.rate_plan_name} - ${p.charge_name}`).join('\n') || '';

    // Use Lovable AI to understand the feedback and generate update instructions
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
            content: `You are a product categorization assistant. Analyze user feedback about product categories and determine:
1. What products/patterns the user is referring to
2. What the correct category should be
3. Provide structured output using the categorization_update tool.

Available categories:
- SaaS (Software as a Service)
- Hardware (Physical products)
- Hardware One Time (One-time hardware purchases)
- Tech (Technology products/services)
- Hybrid (Combination of multiple types)
- Services (Professional services)
- Consulting (Consulting services)
- Support (Support services)
- Training (Training/education services)
- Tiered (Tiered pricing model)
- Freemium (Freemium pricing model)`
          },
          {
            role: 'user',
            content: `User feedback: "${feedback}"

Current category: ${selectedCategory}

Some PRPCs in this category:
${prpcList}

Based on this feedback, what product category updates should be made?`
          }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'categorization_update',
              description: 'Update product categorization based on user feedback',
              parameters: {
                type: 'object',
                properties: {
                  new_category: {
                    type: 'string',
                    description: 'The correct product category'
                  },
                  pattern_to_match: {
                    type: 'string',
                    description: 'Pattern or keyword to identify which products should be updated (e.g., "hardware", "server", etc.)'
                  },
                  rationale: {
                    type: 'string',
                    description: 'Explanation of why this categorization is correct'
                  }
                },
                required: ['new_category', 'pattern_to_match', 'rationale'],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'categorization_update' } }
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      throw new Error(`AI API returned ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    console.log('AI response:', JSON.stringify(aiData, null, 2));

    const toolCall = aiData.choices[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      throw new Error('No tool call in AI response');
    }

    const args = JSON.parse(toolCall.function.arguments);
    console.log('Parsed arguments:', args);

    // Update matching PRPCs
    const pattern = args.pattern_to_match.toLowerCase();
    const matchingPrpcs = prpcs?.filter(p => 
      p.product_name.toLowerCase().includes(pattern) ||
      p.rate_plan_name.toLowerCase().includes(pattern) ||
      p.charge_name.toLowerCase().includes(pattern)
    ) || [];

    console.log(`Found ${matchingPrpcs.length} matching PRPCs for pattern: ${pattern}`);

    if (matchingPrpcs.length > 0) {
      const { error: updateError } = await supabase
        .from('prpc_inferences')
        .update({
          inferred_product_category: args.new_category,
          rationale: args.rationale,
          status: 'user_adjusted'
        })
        .in('id', matchingPrpcs.map(p => p.id));

      if (updateError) {
        console.error('Update error:', updateError);
        throw updateError;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        updated_count: matchingPrpcs.length,
        new_category: args.new_category,
        rationale: args.rationale,
        pattern: args.pattern_to_match
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
