import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSessionUser } from '@/lib/session';
import { isTeamMember, isTeamStaff } from '@/lib/permissions';
import { parseCoordinates, directionsUrl, formatVenueAddress } from '@/lib/venues';

/** Saved venues for a team. Any member can read them; staff manage the list. */
export async function GET(req: NextRequest) {
    try {
        const user = getSessionUser(req);
        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const teamId = searchParams.get('teamId');

        // Without a teamId, return venues across every team the user is on — this is
        // what the event form uses so a coach managing two teams sees both lists.
        let teamIds: string[];
        if (teamId) {
            if (!(await isTeamMember(user, teamId))) {
                return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
            }
            teamIds = [teamId];
        } else {
            const memberships = await prisma.teamMember.findMany({
                where: { userId: user.id },
                select: { teamId: true },
            });
            teamIds = memberships.map((m) => m.teamId);
        }

        const venues = await prisma.venue.findMany({
            where: { teamId: { in: teamIds } },
            include: { _count: { select: { events: true } } },
            orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
        });

        return NextResponse.json({
            success: true,
            data: venues.map((v) => ({
                id: v.id,
                teamId: v.teamId,
                name: v.name,
                address: v.address,
                city: v.city,
                region: v.region,
                postalCode: v.postalCode,
                latitude: v.latitude,
                longitude: v.longitude,
                notes: v.notes,
                mapUrl: v.mapUrl,
                isDefault: v.isDefault,
                formattedAddress: formatVenueAddress(v),
                directionsUrl: directionsUrl(v),
                eventCount: v._count.events,
            })),
        });
    } catch (error) {
        console.error('Fetch venues error:', error);
        return NextResponse.json({ success: false, error: 'Failed to fetch venues' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const user = getSessionUser(req);
        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { teamId, name, address, city, region, postalCode, latitude, longitude, notes, mapUrl, isDefault } =
            await req.json();

        if (!teamId || !name?.trim()) {
            return NextResponse.json({ success: false, error: 'teamId and name are required' }, { status: 400 });
        }
        if (!(await isTeamStaff(user, teamId))) {
            return NextResponse.json({ success: false, error: 'Only team staff can add venues' }, { status: 403 });
        }

        const coords = parseCoordinates(latitude, longitude);
        if (coords.error) {
            return NextResponse.json({ success: false, error: coords.error }, { status: 400 });
        }

        const venue = await prisma.$transaction(async (tx) => {
            // Only one default per team, so clear the previous one first.
            if (isDefault) {
                await tx.venue.updateMany({ where: { teamId, isDefault: true }, data: { isDefault: false } });
            }
            return tx.venue.create({
                data: {
                    teamId,
                    name: name.trim().slice(0, 120),
                    address: address?.trim() || null,
                    city: city?.trim() || null,
                    region: region?.trim() || null,
                    postalCode: postalCode?.trim() || null,
                    latitude: coords.latitude,
                    longitude: coords.longitude,
                    notes: notes?.trim()?.slice(0, 500) || null,
                    mapUrl: mapUrl?.trim() || null,
                    isDefault: Boolean(isDefault),
                },
            });
        });

        return NextResponse.json({
            success: true,
            data: { ...venue, formattedAddress: formatVenueAddress(venue), directionsUrl: directionsUrl(venue) },
        }, { status: 201 });
    } catch (error) {
        console.error('Create venue error:', error);
        return NextResponse.json({ success: false, error: 'Failed to create venue' }, { status: 500 });
    }
}
