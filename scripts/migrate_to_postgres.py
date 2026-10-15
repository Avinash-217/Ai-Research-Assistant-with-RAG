"""
Database Migration Utility: SQLite to PostgreSQL + pgvector.

Usage:
    python scripts/migrate_to_postgres.py --target-url "postgresql://user:password@localhost:5432/research_db" [--dry-run]
"""
import os
import sys
import argparse
import logging
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker

# Setup logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("migration")

def parse_args():
    parser = argparse.ArgumentParser(description="Migrate AI Research Assistant SQLite to PostgreSQL + pgvector")
    parser.add_argument("--sqlite-path", default="./data/research_assistant.db", help="Path to source SQLite database")
    parser.add_argument("--target-url", required=True, help="PostgreSQL target connection string")
    parser.add_argument("--dry-run", action="store_true", help="Inspect and validate without committing changes")
    return parser.parse_args()

def main():
    args = parse_args()

    sqlite_url = f"sqlite:///{os.path.abspath(args.sqlite_path)}"
    logger.info(f"Connecting to source SQLite DB: {sqlite_url}")
    src_engine = create_engine(sqlite_url)

    logger.info(f"Connecting to target PostgreSQL DB: {args.target_url}")
    tgt_engine = create_engine(args.target_url)

    # 1. Enable pgvector extension in PostgreSQL target
    if not args.dry_run:
        with tgt_engine.connect() as conn:
            logger.info("Ensuring 'vector' extension is enabled in PostgreSQL...")
            conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector;"))
            conn.commit()

    # 2. Inspect tables from source
    src_inspector = inspect(src_engine)
    tables = src_inspector.get_table_names()
    logger.info(f"Found {len(tables)} tables to migrate: {', '.join(tables)}")

    # 3. Migrate each table data
    for table_name in tables:
        with src_engine.connect() as src_conn:
            rows = src_conn.execute(text(f"SELECT * FROM {table_name}")).fetchall()
            logger.info(f"Table '{table_name}': {len(rows)} rows found.")

            if not args.dry_run and rows:
                with tgt_engine.connect() as tgt_conn:
                    # Dynamically get columns
                    columns = [col['name'] for col in src_inspector.get_columns(table_name)]
                    col_names = ", ".join(columns)
                    placeholders = ", ".join([f":{col}" for col in columns])
                    insert_stmt = text(f"INSERT INTO {table_name} ({col_names}) VALUES ({placeholders}) ON CONFLICT DO NOTHING")
                    
                    row_dicts = [dict(zip(columns, row)) for row in rows]
                    tgt_conn.execute(insert_stmt, row_dicts)
                    tgt_conn.commit()
                    logger.info(f"Successfully migrated {len(rows)} records into target '{table_name}'.")

    if args.dry_run:
        logger.info("DRY-RUN completed successfully. No changes written to PostgreSQL.")
    else:
        logger.info("Migration to PostgreSQL + pgvector completed successfully!")

if __name__ == "__main__":
    main()
