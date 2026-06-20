
use axum::{extract::Request, http::{HeaderMap, StatusCode, header}, middleware::Next, response::Response};
use jsonwebtoken::{DecodingKey, EncodingKey, Header, Validation, decode, encode};
use serde::{Deserialize, Serialize};

use crate::modules::{EntityId};

const MY_SECRET_WORD: &str = "my_super_secret_word";

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Claims {
    pub user_id: crate::modules::EntityId,
    exp: usize,
}

pub fn create_token(user_id: EntityId) -> String {
    let my_claims = Claims {
        user_id,
        exp: 2217571200,
    };

    encode(
        &Header::default(),
        &my_claims,
        &EncodingKey::from_secret(MY_SECRET_WORD.as_ref()),
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
        Some(claims)  => {
            req.extensions_mut().insert(claims);
            let response = next.run(req).await;
            Ok(response)
        }
        _ => {
            Err(StatusCode::UNAUTHORIZED)
        }
    }
}

pub fn get_token(headers: HeaderMap) -> Option<Claims> {

    match headers.get("authorization") {
        Some(header) => {
            let token_data = decode::<Claims>(
                header.to_str().unwrap(),
                &DecodingKey::from_secret(MY_SECRET_WORD.as_ref()),
                &Validation::default(),
            );
            match token_data {
                Ok(token) => Some(token.claims),
                _ => None,
            }
        }
        None => None,
    }
}
