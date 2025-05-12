#version 410

uniform float uTime;

#define EPSILON 0.001 
#define BIG 1000000.0 

const int DIFFUSE_REFLECTION = 1;
const int MIRROR_REFLECTION = 2;

out vec4 FragColor; 
in vec3 vPos;

struct SCamera 
{ 
    vec3 Position; 
    vec3 View; 
    vec3 Up; 
    vec3 Side; 
    vec2 Scale; 
}; 
 
struct SRay 
{ 
    vec3 Origin; 
    vec3 Direction; 
};

struct SSphere 
{ 
    vec3 Center; 
    float Radius; 
    int MaterialIdx; 
};

struct STriangle 
{ 
    vec3 v1; 
    vec3 v2; 
    vec3 v3; 
    int MaterialIdx;
    vec3 Normal;
}; 

struct SIntersection 
{ 
    float Time; 
    vec3 Point; 
    vec3 Normal; 
    vec3 Color; 

    vec4 LightCoeffs;
    float ReflectionCoef; 
    float RefractionCoef; 
    int MaterialType; 
}; 

struct SMaterial 
{ 
    vec3 Color; 
    vec4 LightCoeffs; 
    float ReflectionCoef; 
    float RefractionCoef; 
    int MaterialType; 
}; 

struct SLight 
{ 
    vec3 Position; 
}; 

SLight lights[100];

struct STracingRay 
{ 
    SRay ray; 
    float contribution; 
    int depth; 
}; 

STracingRay stack[10];
int stackSize = 0;

bool isEmpty()
{
	if (stackSize == 0) return true;
	return false;
}

void pushRay(STracingRay ray)
{
	stack[stackSize] = ray;
	stackSize = stackSize + 1;
}

STracingRay popRay() 
{
	stackSize = stackSize - 1;
	return stack[stackSize];
}

SRay GenerateRay (SCamera uCamera) 
{ 
    vec2 coords = vPos.xy * uCamera.Scale; 
    vec3 direction = uCamera.View + uCamera.Side * coords.x + uCamera.Up * coords.y; 
    return SRay ( uCamera.Position, normalize(direction) ); 
} 

STriangle triangles[12]; 
SSphere spheres[4];
SLight light;
SMaterial materials[5]; 
SCamera uCamera;

void initializeDefaultScene(out STriangle triangles[12], out SSphere spheres[4])
{
    /** TRIANGLES **/
    /*front wall */

    triangles[0].v1 = vec3(-5.0, 5.0, 5.0);
    triangles[0].v2 = vec3(5.0, 5.0, 5.0);
    triangles[0].v3 = vec3(-5.0, -5.0, 5.0);
    vec3 frontNormal = normalize(cross(triangles[0].v2 - triangles[0].v1, triangles[0].v3 - triangles[0].v1));
    triangles[0].MaterialIdx = 0;
    triangles[0].Normal = frontNormal;
    triangles[1].v1 = vec3(5.0, -5.0, 5.0);
    triangles[1].v2 = vec3(5.0, 5.0, 5.0);
    triangles[1].v3 = vec3(-5.0, -5.0, 5.0);
    triangles[1].MaterialIdx = 0;
    triangles[1].Normal = frontNormal;
    
    /* right wall */
    triangles[2].v1 = vec3(5.0, 5.0, 5.0);
    triangles[2].v2 = vec3(5.0, 5.0, -5.0);
    triangles[2].v3 = vec3(5.0, -5.0, 5.0);
    vec3 rightNormal = normalize(cross(triangles[2].v2 - triangles[2].v1, triangles[2].v3 - triangles[2].v1));
    triangles[2].MaterialIdx = 1;
    triangles[2].Normal = rightNormal;
    triangles[3].v1 = vec3(5.0, -5.0, -5.0);
    triangles[3].v2 = vec3(5.0, 5.0, -5.0);
    triangles[3].v3 = vec3(5.0, -5.0, 5.0);
    triangles[3].MaterialIdx = 1;
    triangles[3].Normal = rightNormal;

    /* back wall */
    triangles[4].v1 = vec3(-5.0,-5.0, 5.0);
    triangles[4].v2 = vec3( 5.0,-5.0, 5.0);
    triangles[4].v3 = vec3(-5.0, 5.0, 5.0);
    vec3 backNormal = normalize(cross(triangles[4].v3 - triangles[4].v1, triangles[4].v2 - triangles[4].v1));
    triangles[4].MaterialIdx = 0;
    triangles[4].Normal = backNormal;
    triangles[5].v1 = vec3( 5.0, 5.0, 5.0);
    triangles[5].v2 = vec3(-5.0, 5.0, 5.0);
    triangles[5].v3 = vec3( 5.0,-5.0, 5.0);
    triangles[5].MaterialIdx = 0;
    triangles[5].Normal = backNormal;

    /* left wall */
    triangles[6].v1 = vec3(-5.0,-5.0,-5.0);
    triangles[6].v2 = vec3(-5.0, 5.0, 5.0);
    triangles[6].v3 = vec3(-5.0, 5.0,-5.0);
    vec3 leftNormal = normalize(cross(triangles[6].v3 - triangles[6].v1, triangles[6].v2 - triangles[6].v1));
    triangles[6].MaterialIdx = 2;
    triangles[6].Normal = leftNormal;
    triangles[7].v1 = vec3(-5.0,-5.0,-5.0);
    triangles[7].v2 = vec3(-5.0,-5.0, 5.0);
    triangles[7].v3 = vec3(-5.0, 5.0, 5.0);
    triangles[7].MaterialIdx = 2;
    triangles[7].Normal = leftNormal;

    /* top wall */
    triangles[8].v1 = vec3(-5.0,5.0,-5.0);
    triangles[8].v2 = vec3(5.0, 5.0, -5.0);
    triangles[8].v3 = vec3(-5.0, 5.0,5.0);
    vec3 topNormal = normalize(cross(triangles[8].v2 - triangles[8].v1, triangles[8].v3 - triangles[8].v1));
    triangles[8].MaterialIdx = 3;
    triangles[8].Normal = topNormal;
    triangles[9].v1 = vec3(5.0,5.0,5.0);
    triangles[9].v2 = vec3(5.0, 5.0, -5.0);
    triangles[9].v3 = vec3(-5.0, 5.0,5.0);
    triangles[9].MaterialIdx = 3;
    triangles[9].Normal = topNormal;

    /* bottom wall */
    triangles[10].v1 = vec3(-5.0,-5.0,-5.0);
    triangles[10].v2 = vec3(5.0, -5.0, -5.0);
    triangles[10].v3 = vec3(-5.0, -5.0,5.0);
    vec3 bottomNormal = normalize(cross(triangles[10].v3 - triangles[10].v1, triangles[10].v2 - triangles[10].v1));
    triangles[10].MaterialIdx = 4;
    triangles[10].Normal = bottomNormal;
    triangles[11].v1 = vec3(5.0,-5.0,5.0);
    triangles[11].v2 = vec3(5.0,-5.0, -5.0);
    triangles[11].v3 = vec3(-5.0, -5.0,5.0);
    triangles[11].MaterialIdx = 4;
    triangles[11].Normal = bottomNormal;

    /** SPHERES **/
    spheres[0].Center = vec3(-1.0,-1.0,-2.0);
    spheres[0].Radius = 2.0;
    spheres[0].MaterialIdx = 0;

    spheres[1].Center = vec3(2.0,1.0,2.0);
    spheres[1].Radius = 1.0;
    spheres[1].MaterialIdx = 2;

    spheres[2].Center = vec3(2.5, -1.65, -1.5);
    spheres[2].Radius = 0.5;
    spheres[2].MaterialIdx = 3;

    spheres[3].Center = vec3(-2.0, 2.5, 1.0);
    spheres[3].Radius = 0.65;
    spheres[3].MaterialIdx = 4;
}



bool IntersectSphere ( SSphere sphere, SRay ray, float start, float final, out float time ) 
{ 
    ray.Origin -= sphere.Center; 
    float A = dot ( ray.Direction, ray.Direction ); 
    float B = dot ( ray.Direction, ray.Origin ); 
    float C = dot ( ray.Origin, ray.Origin ) - sphere.Radius * sphere.Radius; 
    float D = B * B - A * C; 
    if ( D > 0.0 ) 
    { 
        D = sqrt ( D ); 
        //time = min ( max ( 0.0, ( -B - D ) / A ), ( -B + D ) / A ); 
        float t1 = ( -B - D ) / A; 
        float t2 = ( -B + D ) / A; 
        if(t1 < 0 && t2 < 0) 
        return false; 
         
        if(min(t1, t2) < 0) 
        { 
            time = max(t1,t2); 
            return true; 
        } 
        time = min(t1, t2); 
        return true; 
    } 
    return false; 
} 

bool IntersectTriangle (SRay ray, vec3 v1, vec3 v2, vec3 v3, out float time ) 
{ 
    // // Compute the intersection of ray with a triangle using geometric solution  
    // Input: // points v0, v1, v2 are the triangle's vertices  
    // rayOrig and rayDir are the ray's origin (point) and the ray's direction  
    // Return: // return true is the ray intersects the triangle, false otherwise  
    // bool intersectTriangle(point v0, point v1, point v2, point rayOrig, vector rayDir) {  
    // compute plane's normal vector  
    time = -1; 
    vec3 A = v2 - v1; 
    vec3 B = v3 - v1; 
    // no need to normalize vector  
    vec3 N = cross(A, B); 
    // N  
    // // Step 1: finding P 
    // // check if ray and plane are parallel ?  
    float NdotRayDirection = dot(N, ray.Direction); 
    if (abs(NdotRayDirection) < 0.001)  
        return false; 
    // they are parallel so they don't intersect !  
    // compute d parameter using equation 2  
    float d = dot(N, v1); 
    // compute t (equation 3)  
    float t = -(dot(N, ray.Origin) - d) / NdotRayDirection; 
    // check if the triangle is in behind the ray  
    if (t < 0)  
        return false; 
    // the triangle is behind  
    // compute the intersection point using equation 1  
    vec3 P = ray.Origin + t * ray.Direction; 
    // // Step 2: inside-outside test //  
    vec3 C; 
    // vector perpendicular to triangle's plane  
    // edge 0  
    vec3 edge1 = v2 - v1; 
    vec3 VP1 = P - v1; 
    C = cross(edge1, VP1); 
    if (dot(N, C) < 0) 
        return false; 
    // P is on the right side  
    // edge 1  
    vec3 edge2 = v3 - v2; 
    vec3 VP2 = P - v2; 
    C = cross(edge2, VP2); 
    if (dot(N, C) < 0)  
        return false; 
    // P is on the right side  
    // edge 2  
    vec3 edge3 = v1 - v3; 
    vec3 VP3 = P - v3; 
    C = cross(edge3, VP3); 
    if (dot(N, C) < 0)  
        return false; 
    // P is on the right side;  
    time = t; 
    return true; 
    // this ray hits the triangle 
} 

bool Raytrace(SRay ray, SSphere spheres[4], STriangle triangles[12], SMaterial materials[5], float start, float final, inout SIntersection intersect)
{
	bool result = false;
	float test = start;
	intersect.Time = final;
	for(int i = 0; i < 4; i++)
	{
		SSphere sphere = spheres[i];
		if(IntersectSphere(sphere, ray, start, final, test ) && test < intersect.Time )
		{
			intersect.Time = test;
            intersect.Point = ray.Origin + ray.Direction * test;
            intersect.Normal = normalize ( intersect.Point - spheres[i].Center );
            intersect.Color = materials[sphere.MaterialIdx].Color;
            intersect.LightCoeffs = materials[sphere.MaterialIdx].LightCoeffs;
            intersect.ReflectionCoef = materials[sphere.MaterialIdx].ReflectionCoef;
            intersect.RefractionCoef = materials[sphere.MaterialIdx].RefractionCoef;
            intersect.MaterialType = materials[sphere.MaterialIdx].MaterialType;
            result = true;
		}
	}
	for(int i = 0; i < 12; i++)
	{
		STriangle triangle = triangles[i];
		if(IntersectTriangle(ray, triangle.v1, triangle.v2, triangle.v3, test) && test < intersect.Time)
		{
			intersect.Time = test;
			intersect.Point = ray.Origin + ray.Direction * test;
            intersect.Normal = triangle.Normal;
            int matIdx = triangle.MaterialIdx;
			intersect.Color = materials[matIdx].Color;
			intersect.LightCoeffs = materials[1].LightCoeffs;
			intersect.ReflectionCoef = materials[1].ReflectionCoef;
			intersect.RefractionCoef = materials[1].RefractionCoef;
			intersect.MaterialType = materials[1].MaterialType;
			result = true;
		}
	}
	return result;
}

void initializeDefaultLightMaterials(out SLight light, out SMaterial materials[5])
{
    //** LIGHT **//
    float x = -1.0f;
    float y = 2.0f;

    for(int i =0;i<10;i++)
    {
        x = -1.0f;
        for(int j = 0; j < 10; j++)
        {
            if (x < 0.01 && x > -0.2)
            {
                x = 0.2;
            }
            if (y < 3.0001 && y > 2.9)
            {
                y = 3.2;
            }
            lights[i*10 + j].Position = vec3(x,y, -7.0f);
            x += 0.2;
            
        }
        y += 0.2;
    }

    //float x = -1.0f;
    //float y = -1.0f;

    //for(int i =0;i<10;i++)
    //{
    //    x = -1.0f;
    //    for(int j = 0; j < 10; j++)
    //    {
    //        if (x < 0.01 && x > -0.1)
    //        {
    //            x = 0.2;
    //        }
    //        if (y < 0.01 && y > -0.1)
    //        {
    //            y = 0.2;
    //        }
    //        lights[i*10 + j].Position = vec3(x,y, -7.0f);
    //        x += 0.2;
    //        
    //    }
    //    y += 0.2;
    //}



    /** MATERIALS **/
    //ka - ambient, kd - diff, ks - specular, p - glare
    vec4 lightCoefs = vec4(0.3,0.8,0.2,64);

    materials[0].Color = vec3(0.0, 0.0, 1.0);
    materials[0].LightCoeffs = vec4(lightCoefs);
    materials[0].ReflectionCoef = 0.4;
    materials[0].RefractionCoef = 1.0;
    materials[0].MaterialType = MIRROR_REFLECTION;

    materials[1].Color = vec3(0.5, 0.8, 0.5);
    materials[1].LightCoeffs = vec4(lightCoefs);
    materials[1].ReflectionCoef = 0.5;
    materials[1].RefractionCoef = 1.0;
    materials[1].MaterialType = DIFFUSE_REFLECTION;

    materials[2].Color = vec3(1.0, 0.0, 0.0);
    materials[2].LightCoeffs = vec4(lightCoefs);
    materials[2].ReflectionCoef = 0.4;
    materials[2].RefractionCoef = 1.0;
    materials[2].MaterialType = MIRROR_REFLECTION;

    materials[3].Color = vec3(1.0, 1.0, 0.0);
    materials[3].LightCoeffs = vec4(lightCoefs);
    materials[3].ReflectionCoef = 0.5;
    materials[3].RefractionCoef = 1.0;
    materials[3].MaterialType = DIFFUSE_REFLECTION;

    materials[4].Color = vec3(0.8, 0.8, 0.8);
    materials[4].LightCoeffs = vec4(lightCoefs);
    materials[4].ReflectionCoef = 0.5;
    materials[4].RefractionCoef = 1.0;
    materials[4].MaterialType = MIRROR_REFLECTION;

}

vec3 Phong (SIntersection intersect, SLight currLight, float shadow)
{

	vec3 light = normalize ( currLight.Position - intersect.Point );
	float diffuse = max(dot(light, intersect.Normal), 0.0);
	vec3 view = normalize(uCamera.Position - intersect.Point);
	vec3 reflected= reflect( -view, intersect.Normal );
	float specular = pow(max(dot(reflected, light), 0.0), intersect.LightCoeffs.w);

    // Ambient has no specific direction, so we just look at the material's ambient light coefficient and multiply it by its base color.

    // Diffuse - reflection from matte surfaces, the brightness of such reflection depends on the angle between the normal and the direction to the light source.
    // Therefore, we multiply the diffuse reflection coefficient by the base color; the dot product (not vector product/cross product), because the vectors are normalized, gives cos(angle between them), which is exactly 1 at angle 0, and 0 at 90.
    // max is used to clamp negative values; shadow determines if it's in shadow (then multiplier is 0) or not in shadow (then - 1). (Note: shadow should be 1 if not in shadow)

    // Specular reflection from mirror-like surfaces.
    // We look at reflect(-view) relative to the surface normal; again, we look at the angle between reflected and light, i.e., between the ideal reflection towards the observation point and the actual reflection (of light towards the eye).
    // The smaller the angle, the brighter the highlight; coefficient p (shininess exponent) regulates the brightness of the highlight, to quickly reduce the highlight if the angle deviates from the desired one.
	
    return intersect.LightCoeffs.x * intersect.Color + intersect.LightCoeffs.y * diffuse * intersect.Color * shadow + intersect.LightCoeffs.z * specular;
}

float Shadow(SLight currLight, SIntersection intersect)
{
	/*Point is lighted*/
	float shadowing = 1.0;

	/*Vector to the light source*/
	vec3 direction = normalize(currLight.Position - intersect.Point);

	/*Distance to the light source */
	float distanceLight = distance(currLight.Position, intersect.Point);

	/* Generation shadow ray for this light source*/
	SRay shadowRay = SRay(intersect.Point + direction * 0.001, direction);

	/* ...test intersection this ray with each scene object */
	SIntersection shadowIntersect;
	shadowIntersect.Time = 1000000.0;

	/* trace ray from shadow ray begining to light source position*/
	if(Raytrace(shadowRay, spheres, triangles, materials, 0, distanceLight, shadowIntersect))
	{
	    /* this light source is invisible in the intercection point */
	    shadowing = 0.0;
	}
	return shadowing;
}

SCamera initializeDefaultCamera()
{
    SCamera camera;
    camera.Position = vec3(0.0, 0.0, -10.0);
    camera.View = vec3(0.0, 0.0, 1.0);
    camera.Up = vec3(0.0, 1.0, 0.0);
    camera.Side = vec3(1.0, 0.0, 0.0);
    camera.Scale = vec2(1.0);
    return camera;
}

void main ( void )
{
    float start = 0;
    float final = BIG;
    SCamera uCamera = initializeDefaultCamera();
    SRay ray = GenerateRay(uCamera);
    initializeDefaultLightMaterials(light, materials);
    SIntersection intersect;
    intersect.Time = BIG;
    vec3 resultColor = vec3(0,0,0);
    initializeDefaultScene(triangles, spheres);

    STracingRay trRay = STracingRay(ray, 0.01, 0);
	pushRay(trRay);
	while(!isEmpty())
	{
		STracingRay trRay = popRay();
		ray = trRay.ray;
		SIntersection intersect;
		intersect.Time = BIG;
		start = 0;
		final = BIG;
		if (Raytrace(ray, spheres, triangles, materials, start, final, intersect))
		{
			switch(intersect.MaterialType)
			{
				case DIFFUSE_REFLECTION:
				{
                    for(int i = 0; i < 100;i++)
                    {
                        float shadowing = Shadow(lights[i], intersect);
					    resultColor += trRay.contribution * Phong ( intersect, lights[i], shadowing );
                    }
					
					break;
				}
				case MIRROR_REFLECTION:  
                { 
                    if(intersect.ReflectionCoef < 1) //check if its not 100% mirror
                    { 
                    //then we have to calc the contibution
                        
                        for(int i = 0; i < 100;i++)
                        {
                            float contribution = trRay.contribution * (1 - intersect.ReflectionCoef); 
                            float shadowing = Shadow(lights[i], intersect);
					        resultColor += trRay.contribution * Phong ( intersect, lights[i], shadowing );
                        }
                    } 
                    //create new reflected ray
                    vec3 reflectDirection = reflect(ray.Direction, intersect.Normal); 
                    float contribution = trRay.contribution * intersect.ReflectionCoef; 
                    STracingRay reflectRay = STracingRay(SRay(intersect.Point + reflectDirection * 0.001, reflectDirection), contribution, trRay.depth + 1); 
                    pushRay(reflectRay); 
                    break; 
                } 
			}
		} 
	} 
	
    FragColor = vec4 (resultColor, 1.0);
}