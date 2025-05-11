#version 410

in vec3 vPosition;
out vec3 vPos;

void main (void)
{
	gl_Position = vec4(vPosition, 1.0);
	vPos = vPosition;
}
