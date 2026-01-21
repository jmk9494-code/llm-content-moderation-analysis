import { NextRequest, NextResponse } from 'next/server';
import { createClient } from 'redis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: jobId } = await params;

    if (!jobId) {
        return NextResponse.json({ error: 'Job ID required' }, { status: 400 });
    }

    try {
        // Connect to Redis to get Celery task status
        const client = createClient({ url: REDIS_URL });
        await client.connect();

        // Celery stores results with prefix "celery-task-meta-"
        const resultKey = `celery-task-meta-${jobId}`;
        const resultData = await client.get(resultKey);

        await client.disconnect();

        if (!resultData) {
            // Check if task is pending (no result yet)
            return NextResponse.json({
                job_id: jobId,
                status: 'PENDING',
                message: 'Task is queued or not found'
            });
        }

        const result = JSON.parse(resultData);

        return NextResponse.json({
            job_id: jobId,
            status: result.status,
            result: result.result,
            traceback: result.traceback,
        });

    } catch (error) {
        console.error('Redis error:', error);

        // Fallback: Return pending status if Redis is not available
        return NextResponse.json({
            job_id: jobId,
            status: 'UNKNOWN',
            error: 'Could not connect to job queue. Is Redis running?'
        });
    }
}
