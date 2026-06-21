mod config;
mod modules;
mod auth_middleware;

use std::net::SocketAddr;
use std::time::Duration;
use axum::Router;
use sqlx::postgres::PgPoolOptions;
use tower_http::services::{ServeDir, ServeFile};

use crate::config::Config;

#[tokio::main]
async fn main() {

    let config = Config::init();

    let host_and_port = format!("0.0.0.0:{}", config.port);
    let static_dir = &config.static_dir;

    let pool = PgPoolOptions::new()
           .max_connections(5)
           .acquire_timeout(Duration::from_secs(3))
           .connect(&config.database_url)
           .await
           .expect("can't connect to database");

    sqlx::migrate!("./migrations")
         .run(&pool.clone())
         .await
         .unwrap();

    // Serve the built front-end. `.fallback` (not `.not_found_service`) serves
    // index.html with a 200 for any unmatched path so client-side routes work.
    let index_html = format!("{static_dir}/index.html");
    let static_service = ServeDir::new(static_dir).fallback(ServeFile::new(index_html));

    let app = Router::new()
        .merge(crate::modules::health::router::build_routes())
        .merge(crate::modules::auth::router::build_routes())
        .merge(crate::modules::todos::router::build_routes())
        .merge(crate::modules::tags::router::build_routes())
        .fallback_service(static_service)
        .with_state(pool);


    let listener = tokio::net::TcpListener::bind(host_and_port).await.unwrap();
    // `into_make_service_with_connect_info` exposes the peer IP so the auth
    // rate-limiter can fall back to it when no proxy header is present.
    axum::serve(
        listener,
        app.into_make_service_with_connect_info::<SocketAddr>(),
    )
    .await
    .unwrap();
}