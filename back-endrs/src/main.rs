mod modules;
mod auth_middleware;

use std::time::Duration;
use axum::Router;
use sqlx::postgres::PgPoolOptions;

#[tokio::main]
async fn main() {

    let db_connection_str = std::env::var("DATABASE_URL").expect("Missing DATABASE_URL env variables");
    let host_and_port = "0.0.0.0:3000";

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

    let app = Router::new()
        .merge(crate::modules::health::router::build_routes())
        .merge(crate::modules::auth::router::build_routes())
        .merge(crate::modules::todos::router::build_routes())
        .with_state(pool);


    let listener = tokio::net::TcpListener::bind(host_and_port).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}