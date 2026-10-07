const fs = require('fs');
let content = fs.readFileSync('supabase/migrations/20261005232914_bypass_sede_check_for_pos.sql', 'utf8');

const target = `IF v_perfil.sede_id IS NULL THEN
        IF v_perfil.rol = 'MASTER' AND p_payload->'factura'->>'sede_id' IS NOT NULL THEN
            v_perfil.sede_id := (p_payload->'factura'->>'sede_id')::UUID;
        ELSE
            RETURN jsonb_build_object(
                'ok',    false,
                'error', 'cajero_sin_sede_asignada'
            );
        END IF;
    END IF;`;

const replacement = `IF v_perfil.sede_id IS NULL THEN
        IF p_payload->'factura'->>'sede_id' IS NOT NULL THEN
            v_perfil.sede_id := (p_payload->'factura'->>'sede_id')::UUID;
        ELSE
            RETURN jsonb_build_object(
                'ok',    false,
                'error', 'cajero_sin_sede_asignada_ni_en_payload'
            );
        END IF;
    END IF;`;

content = content.replace(target, replacement);
fs.writeFileSync('supabase/migrations/20261005232914_bypass_sede_check_for_pos.sql', content);
console.log("Created migration 2");
