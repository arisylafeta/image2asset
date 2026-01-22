import { NextRequest, NextResponse } from 'next/server';
import { listAssets, deleteAsset, getAsset, getAssetLineage, AssetType } from '@/lib/storage/assets';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type') as AssetType | null;
    const search = searchParams.get('search');
    const id = searchParams.get('id');

    if (id) {
      const asset = getAsset(id);
      if (!asset) {
        return NextResponse.json(
          { error: 'Asset not found' },
          { status: 404 }
        );
      }

      const lineage = getAssetLineage(id);

      return NextResponse.json({
        asset,
        lineage,
      });
    }

    const assets = listAssets({
      type: type || undefined,
      search: search || undefined,
    });

    return NextResponse.json({ assets });
  } catch (error) {
    console.error('List assets error:', error);
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
        { error: 'Asset ID is required' },
        { status: 400 }
      );
    }

    const deleted = deleteAsset(id);

    if (!deleted) {
      return NextResponse.json(
        { error: 'Asset not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete asset error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
