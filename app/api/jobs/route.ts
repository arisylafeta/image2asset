import { NextRequest, NextResponse } from 'next/server';
import { getJob, listJobs, deleteJob, JobType, JobStatus } from '@/lib/storage/jobs';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');
    const type = searchParams.get('type') as JobType | null;
    const status = searchParams.get('status') as JobStatus | null;
    const limit = searchParams.get('limit');

    if (id) {
      const job = getJob(id);
      if (!job) {
        return NextResponse.json(
          { error: 'Job not found' },
          { status: 404 }
        );
      }
      return NextResponse.json({ job });
    }

    const jobs = listJobs({
      type: type || undefined,
      status: status || undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });

    return NextResponse.json({ jobs });
  } catch (error) {
    console.error('Get jobs error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Job ID is required' },
        { status: 400 }
      );
    }

    const deleted = deleteJob(id);

    if (!deleted) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete job error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
