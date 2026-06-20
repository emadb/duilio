mod modules;
mod auth_middleware;

use std::time::Duration;
use axum::Router;
use sqlx::postgres::PgPoolOptions;
use tower_http::services::{ServeDir, ServeFile};

#[tokio::main]
async fn main() {

    let db_connection_str = std::env::var("DATABASE_URL").expect("Missing DATABASE_URL env variables");

    let port = std::env::var("PORT").ok().and_then(|p| p.parse::<u16>().ok()).unwrap_or(3000);
    let host_and_port = format!("0.0.0.0:{port}");
    let static_dir = std::env::var("STATIC_DIR").unwrap_or_else(|_| "static-assets".to_string());

    let pool = PgPoolOptions::new()
           .max_connections(5)
           .acquire_timeout(Duration::from_secs(3))
           .connect(&db_connection_str)
           .await
           .expect("can't connect to database");

    sqlx::migrate!("./migrations")
         .run(&pool.clone())
         .await
         .unwrap();

    // Serve the built front-end. `.fallback` (not `.not_found_service`) serves
    // index.html with a 200 for any unmatched path so client-side routes work.
    let index_html = format!("{static_dir}/index.html");
    let static_service = ServeDir::new(&static_dir).fallback(ServeFile::new(index_html));

    let app = Router::new()
        .merge(crate::modules::health::router::build_routes())
        .merge(crate::modules::auth::router::build_routes())
        .merge(crate::modules::todos::router::build_routes())
        .merge(crate::modules::tags::router::build_routes())
        .fallback_service(static_service)
        .with_state(pool);


    let listener = tokio::net::TcpListener::bind(host_and_port).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}