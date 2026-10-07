const fs = require('fs');
let content = fs.readFileSync('supabase/migrations/20260918_000_rpc_upsert_venta_jwt.sql', 'utf8');

// The original logic checks v_perfil.sede_id IS NULL and then uses v_perfil.sede_id.
// We should replace that completely to use the payload's sede_id.
let newContent = content.replace(/IF v_perfil\.sede_id IS NULL THEN[\s\S]*?END IF;/g, `
    -- En vez de requerir que el usuario tenga sede asignada, confiamos en la sede que reporta la caja (POS).
    -- Asi un cajero o mesero de otra sede puede hacer de pasante en esta sede.
    IF p_payload->'factura'->>'sede_id' IS NOT NULL THEN
        v_perfil.sede_id := (p_payload->'factura'->>'sede_id')::UUID;
    ELSIF v_perfil.sede_id IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'error', 'cajero_sin_sede_y_pos_no_envio_sede');
    END IF;
`);

fs.writeFileSync('supabase/migrations/20261005232914_bypass_sede_check_for_pos.sql', newContent);
console.log("Migration updated to use POS sede_id");
