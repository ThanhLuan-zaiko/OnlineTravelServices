import { requireAdministrativeStaff } from "@/lib/server/internal-auth";
import { internalErrorResponse, internalJson } from "@/lib/server/internal-api";
import { createInternalServiceProvider, listInternalServiceProviders } from "@/lib/server/internal-data";
import { assertSameOriginRequest } from "@/lib/server/request-security";
import { serviceProviderMutationSchema } from "@/lib/shared/internal";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    await requireAdministrativeStaff(request);
    const { searchParams } = new URL(request.url);
    const serviceType = searchParams.get("serviceType")?.trim();

    if (!serviceType) {
      return internalJson({ providers: [] });
    }

    const providers = await listInternalServiceProviders(serviceType);
    return internalJson({ providers });
  } catch (error) {
    return internalErrorResponse(error, "Không thể tải danh sách nhà cung cấp.", {
      route: "/api/internal/service-providers#GET",
    });
  }
}

export async function POST(request: Request) {
  try {
    assertSameOriginRequest(request);
    await requireAdministrativeStaff(request);
    const input = serviceProviderMutationSchema.parse(await request.json());
    const provider = await createInternalServiceProvider(input);

    if (!provider) {
      return internalJson({ message: "Không thể tạo nhà cung cấp." }, { status: 500 });
    }

    return internalJson({ provider }, { status: 201 });
  } catch (error) {
    return internalErrorResponse(error, "Không thể tạo nhà cung cấp.", {
      route: "/api/internal/service-providers#POST",
    });
  }
}
