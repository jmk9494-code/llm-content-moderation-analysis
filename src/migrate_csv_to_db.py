import csv
import os
import uuid
import datetime
from src.database import init_db, ModelRegistry, Prompt, AuditResult

def migrate(csv_path="audit_log.csv", db_path="audit.db"):
    if not os.path.exists(csv_path):
        print(f"⚠️ {csv_path} not found. Skipping migration.")
        return

    print(f"🔄 Migrating {csv_path} to {db_path}...")
    
    Session = init_db(db_path)
    session = Session()

    try:
        # Cache for deduplication
        models_cache = {}
        prompts_cache = {}
        
        # Load existing if re-running
        for m in session.query(ModelRegistry).all():
            models_cache[m.id] = m
            
        for p in session.query(Prompt).all():
            prompts_cache[p.id] = p
            
        new_prompts = []
        new_models = []
        new_results = []
        
        with open(csv_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            count = 0
            
            # Generate a single Run ID for legacy data import (or per date?)
            # Let's group by date to be cleaner
            run_ids_by_date = {}

            for row in reader:
                count += 1
                
                # 1. Handle Model
                model_id = row['model']
                if model_id not in models_cache:
                    m = ModelRegistry(id=model_id, family=model_id.split('/')[0] if '/' in model_id else 'unknown')
                    models_cache[model_id] = m
                    new_models.append(m)
                
                # 2. Handle Prompt
                p_id = row['prompt_id']
                if p_id not in prompts_cache:
                    p = Prompt(
                        id=p_id, 
                        category=row.get('category', 'unknown'),
                        text=row.get('prompt_text', '')
                    )
                    prompts_cache[p_id] = p
                    new_prompts.append(p)
                
                # 3. Handle Result
                date_str = row['test_date']
                if date_str not in run_ids_by_date:
                    run_ids_by_date[date_str] = str(uuid.uuid4())
                
                run_id = run_ids_by_date[date_str]
                
                # Parse cost safely
                try:
                    cost = float(row.get('run_cost', 0))
                except:
                    cost = 0.0
                    
                result = AuditResult(
                    run_id=run_id,
                    timestamp=datetime.datetime.strptime(date_str, "%Y-%m-%d"),
                    model_id=model_id,
                    prompt_id=p_id,
                    verdict=row['verdict'],
                    response_text=row.get('response_text', ''),
                    cost=cost,
                    prompt_tokens=int(float(row.get('prompt_tokens', 0) or 0)),
                    completion_tokens=int(float(row.get('completion_tokens', 0) or 0))
                )
                new_results.append(result)
        
        # Batch Insert
        if new_models:
            print(f"   Saving {len(new_models)} new models...")
            session.add_all(new_models)
        
        if new_prompts:
            print(f"   Saving {len(new_prompts)} new prompts...")
            session.add_all(new_prompts)
            
        if new_results:
            print(f"   Saving {len(new_results)} audit logs...")
            session.add_all(new_results)
            
        session.commit()
        print(f"✅ Migration Complete! Imported {count} rows.")
        
    except Exception as e:
        session.rollback()
        print(f"❌ Migration Failed: {e}")
    finally:
        session.close()

if __name__ == "__main__":
    migrate()
