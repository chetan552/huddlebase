import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSessionUser } from '@/lib/session';
import { isTeamStaff } from '@/lib/permissions';
import { parseCoordinates, directionsUrl, formatVenueAddress } from '@/lib/venues';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = getSessionUser(req);
        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const existing = await prisma.venue.findUnique({ where: { id }, select: { teamId: true } });
        if (!existing) {
            return NextResponse.json({ success: false, error: 'Venue not found' }, { status: 404 });
        }
        if (!(await isTeamStaff(user, existing.teamId))) {
            return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
        }

        const { name, address, city, region, postalCode, latitude, longitude, notes, mapUrl, isDefault } =
            await req.json();

        if (name !== undefined && !String(name).trim()) {
            return NextResponse.json({ success: false, error: 'Name cannot be empty' }, { status: 400 });
        }

        const coordsProvided = latitude !== undefined || longitude !== undefined;
        const coords = coordsProvided ? parseCoordinates(latitude, longitude) : null;
        if (coords?.error) {
            return NextResponse.json({ success: false, error: coords.error }, { status: 400 });
        }

        const venue = await prisma.$transaction(async (tx) => {
            if (isDefault) {
                await tx.venue.updateMany({
                    where: { teamId: existing.teamId, isDefault: true, id: { not: id } },
                    data: { isDefault: false },
                });
            }
            return tx.venue.update({
                where: { id },
                data: {
                    ...(name !== undefined && { name: String(name).trim().slice(0, 120) }),
                    ...(address !== undefined && { address: address?.trim() || null }),
                    ...(city !== undefined && { city: city?.trim() || null }),
                    ...(region !== undefined && { region: region?.trim() || null }),
                    ...(postalCode !== undefined && { postalCode: postalCode?.trim() || null }),
                    ...(coords && { latitude: coords.latitude, longitude: coords.longitude }),
                    ...(notes !== undefined && { notes: notes?.trim()?.slice(0, 500) || null }),
                    ...(mapUrl !== undefined && { mapUrl: mapUrl?.trim() || null }),
                    ...(isDefault !== undefined && { isDefault: Boolean(isDefault) }),
                },
            });
        });

        return NextResponse.json({
            success: true,
            data: { ...venue, formattedAddress: formatVenueAddress(venue), directionsUrl: directionsUrl(venue) },
        });
    } catch (error) {
        console.error('Update venue error:', error);
        return NextResponse.json({ success: false, error: 'Failed to update venue' }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = getSessionUser(req);
        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const existing = await prisma.venue.findUnique({ where: { id }, select: { teamId: true } });
        if (!existing) {
            return NextResponse.json({ success: false, error: 'Venue not found' }, { status: 404 });
        }
        if (!(await isTeamStaff(user, existing.teamId))) {
            return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
        }

        // Events keep their free-text location; only the venue link is cleared
        // (the FK is onDelete: SetNull), so history isn't lost.
        await prisma.venue.delete({ where: { id } });

        return NextResponse.json({ success: true, data: { id } });
    } catch (error) {
        console.error('Delete venue error:', error);
        return NextResponse.json({ success: false, error: 'Failed to delete venue' }, { status: 500 });
    }
}
