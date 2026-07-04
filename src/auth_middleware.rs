use axum::{
    extract::Request,
    http::{HeaderMap, StatusCode, header},
    middleware::Next,
    response::Response,
};
use jsonwebtoken::{DecodingKey, EncodingKey, Header, Validation, decode, encode};
use serde::{Deserialize, Serialize};

use crate::config::Config;
use crate::modules::EntityId;

fn jwt_secret() -> &'static str {
    &Config::get().jwt_secret
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Claims {
    // The TS backend signs the payload as `{ userId }`, so we match that field name.
    #[serde(rename = "userId")]
    pub user_id: EntityId,
    exp: usize,
}

pub fn create_token(user_id: EntityId) -> String {
    // 7 days, matching the TS backend's `expiresIn: '7d'`.
    let exp = (chrono::Utc::now().timestamp() + 7 * 24 * 60 * 60) as usize;
    let my_claims = Claims { user_id, exp };

    encode(
        &Header::default(),
        &my_claims,
        &EncodingKey::from_secret(jwt_secret().as_ref()),
    )
    .unwrap()
}

pub async fn auth_middleware_admin(
    headers: HeaderMap,
    mut req: Request,
    next: Next,
) -> Result<Response, StatusCode> {
    let claims = get_token(headers);
    match claims {
        Some(claims) => {
            req.extensions_mut().insert(claims);
            let response = next.run(req).await;
            Ok(response)
        }
        _ => Err(StatusCode::UNAUTHORIZED),
    }
}

pub fn get_token(headers: HeaderMap) -> Option<Claims> {
    let header_value = headers.get(header::AUTHORIZATION)?;
    let raw = header_value.to_str().ok()?;

    // The frontend sends `Authorization: Bearer <token>`; strip the scheme.
    let token = raw.strip_prefix("Bearer ").unwrap_or(raw);

    let token_data = decode::<Claims>(
        token,
        &DecodingKey::from_secret(jwt_secret().as_ref()),
        &Validation::default(),
    );
    match token_data {
        Ok(token) => Some(token.claims),
        _ => None,
    }
}
